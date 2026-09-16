import type { BookSnapshot, IntentOrder } from "@metrix/shared";
import { config } from "../config";

/**
 * MM 循环策略（testnet 模式专用）：
 * 每个轮询周期与 AMM 交替做买卖对手盘 —— 买 → 卖 → 买 → 卖 …
 * 每笔都是真实链上 IOC 交易，用于验证执行链路与积累链上记录。
 *
 * 为什么不用网格穿越：AMM 价格只有被交易才会动，纯等待穿越会死锁；
 * tick 交替保证持续的真实成交（测试网资金损耗可忽略）。
 */

let lastSide: "buy" | "sell" | null = null;

export function resetMmLoop(): void {
  lastSide = null;
}

export function evaluateMmLoop(
  book: BookSnapshot,
  venue: "kuru",
): { intent: IntentOrder; trigger: string } | null {
  const mid = (book.bestBid + book.bestAsk) / 2;
  const side: "buy" | "sell" = lastSide === "buy" ? "sell" : "buy";
  lastSide = side;

  const intent: IntentOrder = {
    clientOrderId: "mm-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    venue,
    market: book.market,
    side,
    type: "market",
    size: String(Number((config.quotePerTrade / mid).toFixed(6))),
    price: String(side === "buy" ? book.bestAsk : book.bestBid),
    strategy: "mm-loop",
    reason: "mm-loop alternating " + side,
  };
  return { intent, trigger: "mm-loop: " + side + " @ " + mid.toFixed(8) };
}
