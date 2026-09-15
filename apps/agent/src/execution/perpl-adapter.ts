import { randomBytes } from "node:crypto";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import type { IntentOrder } from "@metrix/shared";
import { config } from "../config";

/**
 * Perpl 永续执行适配器（docs.perpl.xyz/resources/for-developers/api/websocket.md）
 *
 * 协议要点：
 *  - 下单只能走交易 WS（wss://.../ws/v1/trading），REST 不支持下单
 *  - 连接后第一帧必须认证（mt:29 ApiKeySignIn，Ed25519 签名）
 *    canonical = [chain_id, "trading-ws-signin", timestamp_ms, nonce].join("\\n")
 *  - 下单 mt:22（rq 严格递增幂等键）；每单恰回一个 mt:3（sid:100）
 *    code:0 = 已被网关接受转发（≠成交，成交看 mt:24 订单更新流）
 *  - 订单类型 t：1=开多 2=开空 3=平多 4=平空 5=撤单
 *  - fl 标志：0=GTC 1=PostOnly 2=FOK 4=IOC；lv 杠杆百分之一（1000=10x）
 *  - 认证失败 close code 3401；无效请求 1011
 *
 * ⚠️ W2 验证点：
 *  ① lb（最后执行区块）需要订阅 heartbeat 获取区块号（当前用 0 + W1 确认规则）
 *  ② 市场 price_decimals/size_decimals 应从 GET /v1/pub/context 动态获取
 *  ③ mt:24 订单更新流 → 回填 DecisionEvent 的真实成交价
 */

// @noble/ed25519 v2 需要注入 sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

interface WSLike {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code?: number }) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
}

type PendingResolve = (accepted: boolean) => void;

let ws: WSLike | null = null;
let rqCounter = 0;
let snCounter = 0;
let authed = false;
const pending = new Map<number, PendingResolve>();

function backoff(attempt: number): number {
  const steps = [1000, 2000, 4000, 8000, 16000, 32000, 60000];
  return steps[Math.min(attempt, steps.length - 1)];
}

function signCanonical(chainId: number): { timestamp: string; nonce: string; signature: string } {
  if (!config.perpl.privateKey) throw new Error("Perpl 需要 PERPL_PRIVATE_KEY（Ed25519 seed，64 hex）");
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("base64url");
  const canonical = [chainId, "trading-ws-signin", timestamp, nonce].join("\n");
  const priv = Buffer.from(config.perpl.privateKey, "hex");
  const sig = ed.sign(Buffer.from(canonical), priv);
  return { timestamp, nonce, signature: Buffer.from(sig).toString("base64url") };
}

async function ensureConnection(): Promise<WSLike> {
  if (ws && authed) return ws;
  const Ctor = (globalThis as { WebSocket?: new (url: string) => WSLike }).WebSocket;
  if (!Ctor) throw new Error("当前 Node 版本无原生 WebSocket，需要 >=22");

  return new Promise((resolve, reject) => {
    let attempt = 0;
    const connect = () => {
      const sock = new Ctor(`${config.perpl.wsUrl}/ws/v1/trading`);
      sock.onopen = () => {
        // 第一帧：认证（每次重连使用新的 timestamp + nonce）
        sock.send(
          JSON.stringify({
            mt: 29,
            chain_id: config.perpl.chainId,
            api_key: config.perpl.apiKey,
            ...signCanonical(config.perpl.chainId),
          }),
        );
      };
      sock.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { mt: number; code?: number };
          if (msg.mt === 19 || msg.mt === 23 || msg.mt === 26) {
            // WalletSnapshot/OrdersSnapshot/PositionsSnapshot = 认证成功
            authed = true;
            resolve(sock);
          } else if (msg.mt === 3) {
            // StatusResponse：与 mt:22 的 sn 关联
            const r = pending.get((msg as { sn?: number }).sn ?? -1);
            if (r) {
              pending.delete((msg as { sn?: number }).sn ?? -1);
              r(msg.code === 0);
            }
          }
        } catch {
          /* ignore */
        }
      };
      sock.onclose = (ev) => {
        authed = false;
        ws = null;
        // 3401 = 认证失败：重连需重新签名；指数退避
        setTimeout(connect, backoff(attempt++));
        reject(new Error(`Perpl WS closed (code=${ev?.code ?? "?"})`));
      };
      sock.onerror = () => sock.close();
      ws = sock;
    };
    try {
      connect();
    } catch (err) {
      reject(err as Error);
    }
  });
}

function scalePrice(p: number): number {
  return Math.round(p * 10 ** config.perpl.priceDecimals);
}

function scaleSize(s: number): number {
  return Math.round(s * 10 ** config.perpl.sizeDecimals);
}

/** 订单类型：1=开多 2=开空 3=平多 4=平空 */
function orderType(intent: IntentOrder): number {
  if (intent.side === "buy") return intent.reason.includes("close") ? 3 : 1;
  return intent.reason.includes("close") ? 4 : 2;
}

/**
 * 通过交易 WS 提交永续订单。
 * 返回 true = 网关已接受转发（code 0）；最终成交以 mt:24 为准（W2 接入）。
 */
export async function executePerpl(intent: IntentOrder): Promise<{ txRef: string }> {
  if (!config.perpl.enabled) throw new Error("Perpl 模块未启用（PERPL_ENABLED=true）");
  if (!config.perpl.apiKey || !config.perpl.accountId) {
    throw new Error("Perpl 需要 PERPL_API_KEY / PERPL_ACCOUNT_ID（API Key 注册 + 链上开户，见方案 §7）");
  }
  const sock = await ensureConnection();
  const sn = ++snCounter;
  const rq = ++rqCounter; // W2：rq 需从 account.lfr 播种（WalletSnapshot mt:19）

  const isMarket = intent.type === "market";
  const price = Number(intent.price ?? 0);
  const sizeNotional = Number(intent.size) * price;
  const sizeCoin = sizeNotional / price;

  const req = {
    mt: 22 as const,
    sn,
    rq,
    mkt: config.perpl.marketId,
    acc: config.perpl.accountId,
    t: orderType(intent),
    p: isMarket ? 0 : scalePrice(price), // 市价单 p=0
    s: scaleSize(sizeCoin),
    ms: isMarket ? riskSlippageBps() : undefined, // 市价单滑点上限 bps
    fl: isMarket ? 4 : 0, // IOC for market, GTC for limit
    lv: config.perpl.leverage,
    lb: 0, // W2 验证点 ①：普通单应传 currentBlock+100，由 heartbeat 跟踪
  };
  pending.set(sn, () => undefined);
  sock.send(JSON.stringify(req));
  return { txRef: `perpl-rq${rq}` };
}

function riskSlippageBps(): number {
  // R5：市价单滑点上限（与 Kuru 侧同源）
  return 50;
}

// 保活：每 30s Ping（mt:1）
setInterval(() => {
  if (ws && authed) {
    try {
      ws.send(JSON.stringify({ mt: 1, t: Date.now() }));
    } catch {
      /* reconnect handled by onclose */
    }
  }
}, 30_000).unref();
