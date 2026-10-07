import { randomBytes, createHash } from "node:crypto";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { config } from "../config";

/**
 * Perpl REST 客户端（docs.perpl.xyz/.../authentication.md）
 *
 * REST 仅覆盖：行情（K线/Context）、历史查询、API Key 管理。
 * 下单必须走 WebSocket（见 perpl-adapter.ts）。
 *
 * 认证：Ed25519 API Key，每请求 4 个头：
 *   X-API-Key / X-API-Timestamp / X-API-Nonce / X-API-Signature
 * canonical（6 段，\n 拼接）:
 *   chain_id \n METHOD \n request-target \n timestamp_ms \n nonce \n sha256(body) hex
 */

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const BASE = config.perpl.apiUrl;

function seedBytes(): Buffer {
  if (!config.perpl.privateKey) throw new Error("Perpl 认证需要 PERPL_PRIVATE_KEY / PERPL_API_KEY_SECRET");
  return Buffer.from(config.perpl.privateKey.replace(/^0x/, ""), "hex");
}

function base64url(b: Buffer | Uint8Array): string {
  return Buffer.from(b)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** 组装认证头（与官方 authentication.md 对齐） */
export function authHeaders(method: string, path: string, body = ""): Record<string, string> {
  if (!config.perpl.apiKey) throw new Error("Perpl 认证需要 PERPL_API_KEY");
  const ts = Date.now().toString();
  const nonce = base64url(randomBytes(16));
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const canonical = [config.perpl.chainId, method.toUpperCase(), path, ts, nonce, bodyHash].join("\n");
  const sig = ed.sign(Buffer.from(canonical), seedBytes());
  return {
    "X-API-Key": config.perpl.apiKey,
    "X-API-Timestamp": ts,
    "X-API-Nonce": nonce,
    "X-API-Signature": base64url(sig),
  };
}

// ---------- 公开端点（无需认证） ----------

export interface PerplContext {
  chain: unknown;
  markets: Array<{ id: number; name?: string; price_decimals?: number; size_decimals?: number }>;
  min_account_open_amount?: number;
}

/** 全局配置：链、协议实例、代币、市场（GET /v1/pub/context） */
export async function getContext(): Promise<PerplContext> {
  const r = await fetch(`${BASE}/v1/pub/context`);
  if (!r.ok) throw new Error(`Perpl context ${r.status}`);
  return (await r.json()) as PerplContext;
}

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: string;
  n: number;
}

/** K线（GET /v1/market-data/:market_id/candles/:resolution/:from-:to，最多 1024 根） */
export async function getCandles(
  marketId: number,
  resolutionSec: number,
  fromMs: number,
  toMs: number,
): Promise<Candle[]> {
  const url = `${BASE}/v1/market-data/${marketId}/candles/${resolutionSec}/${fromMs}-${toMs}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Perpl candles ${r.status}`);
  const data = (await r.json()) as { d?: Candle[] };
  return data.d ?? [];
}

// ---------- 认证端点 ----------

/** 成交记录（GET /v1/trading/fills，游标分页） */
export async function getFills(count = 50, page?: string): Promise<unknown> {
  const q = new URLSearchParams({ count: String(count) });
  if (page) q.set("page", page);
  const path = `/v1/trading/fills?${q.toString()}`;
  const r = await fetch(`${BASE}${path}`, { headers: authHeaders("GET", path) });
  if (!r.ok) throw new Error(`Perpl fills ${r.status}`);
  return r.json();
}
