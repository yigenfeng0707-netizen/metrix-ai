import { randomBytes } from "node:crypto";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import type { IntentOrder } from "@metrix/shared";
import { config } from "../config";

/**
 * Perpl 永续执行适配器（docs.perpl.xyz/.../websocket.md）
 *
 * 协议要点：
 *  - 下单只能走交易 WS（wss://.../ws/v1/trading），REST 不支持下单
 *  - 连接后第一帧必须认证（mt:29 ApiKeySignIn，Ed25519 签名）
 *  - 下单 mt:22；每单恰回一个 mt:3（StatusResponse，code:0 = 网关接受）
 *  - mt:24 订单更新 / 成交回填
 */

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

interface WSLike {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code?: number }) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
}

type PendingResolve = (result: { accepted: boolean; code?: number; detail?: string }) => void;

let ws: WSLike | null = null;
let rqCounter = 0;
let snCounter = 0;
let authed = false;
let lastFillRef: string | undefined;
let walletLfr = 0;
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
    let settled = false;
    const connect = () => {
      const sock = new Ctor(`${config.perpl.wsUrl}/ws/v1/trading`);
      sock.onopen = () => {
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
          const msg = JSON.parse(String(ev.data)) as {
            mt: number;
            code?: number;
            sn?: number;
            lfr?: number;
            detail?: string;
            fill_id?: string | number;
            oid?: string | number;
          };
          if (msg.mt === 19 || msg.mt === 23 || msg.mt === 26) {
            if (typeof msg.lfr === "number") {
              walletLfr = msg.lfr;
              rqCounter = Math.max(rqCounter, walletLfr);
            }
            authed = true;
            if (!settled) {
              settled = true;
              resolve(sock);
            }
          } else if (msg.mt === 3) {
            const r = pending.get(msg.sn ?? -1);
            if (r) {
              pending.delete(msg.sn ?? -1);
              r({ accepted: msg.code === 0, code: msg.code, detail: msg.detail });
            }
          } else if (msg.mt === 24) {
            const ref = msg.fill_id ?? msg.oid;
            if (ref !== undefined) lastFillRef = String(ref);
          }
        } catch {
          /* ignore */
        }
      };
      sock.onclose = (ev) => {
        authed = false;
        ws = null;
        if (!settled) {
          settled = true;
          reject(new Error(`Perpl WS closed before auth (code=${ev?.code ?? "?"})`));
        }
        setTimeout(connect, backoff(attempt++));
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

function riskSlippageBps(): number {
  return 50;
}

/**
 * 通过交易 WS 提交永续订单。
 * 等待 mt:3 StatusResponse；code≠0 则抛错。
 * txRef = perpl-rq{N}（及可选 fill id）。
 */
export async function executePerpl(intent: IntentOrder): Promise<{ txRef: string; accepted: boolean }> {
  if (!config.perpl.enabled) throw new Error("Perpl 模块未启用（PERPL_ENABLED=true）");
  if (!config.perpl.apiKey || !config.perpl.accountId) {
    throw new Error("Perpl 需要 PERPL_API_KEY / PERPL_ACCOUNT_ID（API Key 注册 + 链上开户）");
  }
  const sock = await ensureConnection();
  const sn = ++snCounter;
  const rq = ++rqCounter;

  const isMarket = intent.type === "market";
  const price = Number(intent.price ?? 0);
  const sizeNotional = Number(intent.size) * (price || 1);
  const sizeCoin = price > 0 ? sizeNotional / price : Number(intent.size);

  const req = {
    mt: 22 as const,
    sn,
    rq,
    mkt: config.perpl.marketId,
    acc: config.perpl.accountId,
    t: orderType(intent),
    p: isMarket ? 0 : scalePrice(price),
    s: scaleSize(sizeCoin),
    ms: isMarket ? riskSlippageBps() : undefined,
    fl: isMarket ? 4 : 0,
    lv: config.perpl.leverage,
    lb: 0,
  };

  const ack = await new Promise<{ accepted: boolean; code?: number; detail?: string }>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(sn);
      reject(new Error("Perpl order ack timeout (mt:3)"));
    }, 12_000);
    pending.set(sn, (result) => {
      clearTimeout(timer);
      resolve(result);
    });
    sock.send(JSON.stringify(req));
  });

  if (!ack.accepted) {
    throw new Error(`Perpl gateway rejected order (code=${ack.code ?? "?"}): ${ack.detail ?? ""}`);
  }

  const fillSuffix = lastFillRef ? `-fill${lastFillRef}` : "";
  return { txRef: `perpl-rq${rq}${fillSuffix}`, accepted: true };
}

export function lastPerplFillRef(): string | undefined {
  return lastFillRef;
}

setInterval(() => {
  if (ws && authed) {
    try {
      ws.send(JSON.stringify({ mt: 1, t: Date.now() }));
    } catch {
      /* reconnect handled by onclose */
    }
  }
}, 30_000).unref();
