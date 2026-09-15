import type { BookSnapshot, IntentOrder } from "@metrix/shared";
import { config } from "../config";

/**
 * ML 信号策略（PyTorch GPU 服务，方案 §3.2 ml 服务）
 *
 * - 调用 ml 服务 /predict 获取方向概率
 * - p_up > threshold → 买入；p_up < 1-threshold → 卖出
 * - 容错：服务不可达/超时 → 返回 null 静默跳过，绝不阻塞主循环
 * - 该策略不进 P0 闭环，ML_ENABLED 默认 false；Docker compose 中默认开启
 */

let lastSignalTs = 0;
let serviceDown = false;
const COOLDOWN_MS = 15_000;
const TIMEOUT_MS = 2000;

export async function predictUp(prices: number[]): Promise<number | null> {
  if (!config.ml.enabled) return null;
  if (serviceDown) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r = await fetch(`${config.ml.url}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prices: prices.slice(-(config.ml.minHistory + 10)) }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    serviceDown = false;
    const data = (await r.json()) as { p_up: number };
    return data.p_up;
  } catch {
    // 首次失败记一次日志，之后静默（避免刷屏）
    if (!serviceDown) {
      console.warn(`[ml] 服务不可达（${config.ml.url}），ml-signal 已降级跳过`);
      serviceDown = true;
    }
    return null;
  }
}

export function evaluateMlSignal(
  book: BookSnapshot,
  prices: number[],
  pUp: number,
  vaultUsdc: number,
): { intent: IntentOrder; trigger: string } | null {
  if (Date.now() - lastSignalTs < COOLDOWN_MS) return null;

  const side: "buy" | "sell" | null =
    pUp >= config.ml.threshold ? "buy" : pUp <= 1 - config.ml.threshold ? "sell" : null;
  if (!side) return null;

  // 单笔名义 = 净值的 2%（受 R1 ≤5% 约束）
  const mid = (book.bestBid + book.bestAsk) / 2;
  const notional = vaultUsdc * 0.02;
  lastSignalTs = Date.now();
  const trigger = `ml-signal: p_up=${pUp.toFixed(3)} (${side === "buy" ? "≥" : "≤"} ${config.ml.threshold})`;

  return {
    intent: {
      clientOrderId: `ml-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      venue: config.mode === "sim" ? "sim" : "kuru",
      market: book.market,
      side,
      type: "market",
      size: String(Number((notional / mid).toFixed(6))),
      price: String(side === "buy" ? book.bestAsk : book.bestBid),
      strategy: "ml-signal",
      reason: trigger,
    },
    trigger,
  };
}
