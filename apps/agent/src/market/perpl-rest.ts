import { randomBytes, createPrivateKey, sign as nodeSign, type KeyObject } from "node:crypto";
import { config } from "../config";

/**
 * Perpl REST 客户端（docs.perpl.xyz/resources/for-developers/api/rest.md）
 *
 * REST 仅覆盖：行情（K线/Context）、历史查询、API Key 管理。
 * 下单必须走 WebSocket（见 perpl-adapter.ts）。
 *
 * 认证：Ed25519 API Key，每请求 4 个头：
 *   X-API-Key / X-API-Timestamp / X-API-Nonce / X-API-Signature
 * ⚠️ W1 验证点：canonical string 的精确拼接规则以 authentication.md 为准
 *   （当前实现按常见 "<method>\n<path>\n<timestamp>\n<nonce>" 草案，需对照修正）
 */

const BASE = config.perpl.apiUrl; // https://app.perpl.xyz/api

function loadEd25519Key(): KeyObject | null {
  if (!config.perpl.privateKey) return null;
  // 约定：PERPL_PRIVATE_KEY 为 64 hex（32 字节 Ed25519 seed）
  const seed = Buffer.from(config.perpl.privateKey, "hex");
  return createPrivateKey({ key: Buffer.concat([seed, seed]), format: "der", type: "pkcs8" });
}

function base64url(b: Buffer): string {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 组装认证头（W1：对照 authentication.md 校准 canonical string） */
export function authHeaders(method: string, path: string): Record<string, string> {
  const key = loadEd25519Key();
  if (!key || !config.perpl.apiKey) throw new Error("Perpl 认证需要 PERPL_API_KEY / PERPL_PRIVATE_KEY");
  const ts = Date.now().toString();
  const nonce = base64url(randomBytes(16));
  const canonical = `${method.toUpperCase()}\n${path}\n${ts}\n${nonce}`;
  const sig = nodeSign(null, Buffer.from(canonical), key);
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
}

/** 全局配置：链、协议实例、代币、市场（GET /v1/pub/context） */
export async function getContext(): Promise<PerplContext> {
  const r = await fetch(`${BASE}/v1/pub/context`);
  if (!r.ok) throw new Error(`Perpl context ${r.status}`);
  return (await r.json()) as PerplContext;
}

export interface Candle {
  t: number; o: number; h: number; l: number; c: number; v: string; n: number;
}

/** K线（GET /v1/market-data/:market_id/candles/:resolution/:from-:to，最多 1024 根） */
export async function getCandles(marketId: number, resolutionSec: number, fromMs: number, toMs: number): Promise<Candle[]> {
  const url = `${BASE}/v1/market-data/${marketId}/candles/${resolutionSec}/${fromMs}-${toMs}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Perpl candles ${r.status}`);
  const data = (await r.json()) as { d?: Candle[] };
  return data.d ?? [];
}

// ---------- 认证端点（历史查询，W1 验证签名后启用） ----------

/** 成交记录（GET /v1/trading/fills，游标分页） */
export async function getFills(count = 50, page?: string): Promise<unknown> {
  const q = new URLSearchParams({ count: String(count) });
  if (page) q.set("page", page);
  const path = `/v1/trading/fills?${q.toString()}`;
  const r = await fetch(`${BASE}${path}`, { headers: authHeaders("GET", path) });
  if (!r.ok) throw new Error(`Perpl fills ${r.status}`);
  return r.json();
}
