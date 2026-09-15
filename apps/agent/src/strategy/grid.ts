import type { BookSnapshot, GridParams, IntentOrder, Venue } from "@metrix/shared";

// 网格状态：上次所处格位（-1 表示尚未建立基线）
let lastLevel = -1;

export function resetGrid(): void {
  lastLevel = -1;
}

/**
 * 网格策略（确定性规则，LLM 不参与决策）：
 * 价格每下穿一格 → 买入；每上穿一格 → 卖出。
 * live 模式下建议用 Kuru GTC postOnly 限价单挂格位（吃 maker 返佣），
 * sim 模式用市价单即时成交。
 */
export function evaluateGrid(
  book: BookSnapshot,
  p: GridParams,
  venue: Venue,
): { intent: IntentOrder; trigger: string } | null {
  if (!p.enabled) return null;
  if (p.upper <= p.lower || p.grids < 2) return null;
  // 价格跑出网格区间：观望（不追价）
  if (book.bestAsk < p.lower || book.bestBid > p.upper) return null;

  const step = (p.upper - p.lower) / p.grids;
  const mid = (book.bestBid + book.bestAsk) / 2;
  const level = Math.floor((mid - p.lower) / step);
  if (level === lastLevel) return null;

  const prev = lastLevel;
  lastLevel = level;
  if (prev === -1) return null; // 首个 tick 只建立基线，不交易

  const side: "buy" | "sell" = level < prev ? "buy" : "sell";
  const trigger = `price crossed grid level ${prev} → ${level} (${side === "buy" ? "down" : "up"})`;

  const intent: IntentOrder = {
    clientOrderId: `grid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    venue,
    market: book.market,
    side,
    type: "market",
    size: String(p.orderSize),
    price: String(side === "buy" ? book.bestAsk : book.bestBid),
    strategy: "grid",
    reason: trigger,
  };
  return { intent, trigger };
}
