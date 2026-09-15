import type { BookSnapshot, IntentOrder } from "@metrix/shared";
import { isStrongTrend } from "./mean-reversion";
import { config } from "../config";

/**
 * Perp 趋势模块（P1，方案 §2.2 F8）
 *
 * 简单动量跟随：EMA 快慢线同向且偏离超阈值 → 开多/开空；
 * 趋势反转或衰减 → 平仓。状态机避免重复开仓。
 * 触发条件由趋势模块给出，执行走 Perpl（venue: "perpl"）。
 */

type PerpSide = "long" | "short" | "flat";
let state: PerpSide = "flat";

export function resetPerpTrend(): void {
  state = "flat";
}

export function perpSide(): PerpSide {
  return state;
}

export function evaluatePerpTrend(book: BookSnapshot, history: number[]): { intent: IntentOrder; trigger: string } | null {
  if (!config.perpl.enabled) return null;
  if (history.length < 80) return null;

  const mid = (book.bestBid + book.bestAsk) / 2;
  const trendUp = isStrongTrend(history, 20, 60, 0.5);
  const last = history[history.length - 1];
  const prev = history[Math.max(0, history.length - 6)];
  const momentumUp = last > prev;
  const venue = "perpl" as const;

  // 开仓：趋势确立
  if (state === "flat" && trendUp) {
    state = momentumUp ? "long" : "short";
    const side = state === "long" ? "buy" : "sell";
    return {
      intent: {
        clientOrderId: `perp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        venue,
        market: `PERP-M${config.perpl.marketId}`,
        side,
        type: "market",
        size: String(config.perpl.orderUsd / mid), // 以名义 USDC 折算币数
        price: String(mid),
        strategy: "perp-trend",
        reason: `trend confirmed (${state}), momentum ${momentumUp ? "up" : "down"}`,
      },
      trigger: `perp trend ${state} established`,
    };
  }

  // 平仓：趋势衰减（不再强趋势）或动量反转
  if (state !== "flat" && (!trendUp || (state === "long" ? !momentumUp : momentumUp))) {
    const side = state === "long" ? "sell" : "buy";
    const intent: IntentOrder = {
      clientOrderId: `perp-close-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      venue,
      market: `PERP-M${config.perpl.marketId}`,
      side,
      type: "market",
      size: String(config.perpl.orderUsd / mid),
      price: String(mid),
      strategy: "perp-trend",
      reason: `close ${state} position`,
    };
    const trigger = `perp trend decayed, closing ${state}`;
    state = "flat";
    return { intent, trigger };
  }

  return null;
}
