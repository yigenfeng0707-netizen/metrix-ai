import type { BookSnapshot, IntentOrder, MRParams, Venue } from "@metrix/shared";

/**
 * 均值回归 + 趋势过滤（确定性规则，方案 §4.2 策略 B）
 *
 * 信号：价格偏离 VWAP(lookback) 超过 k·σ 时反向入场；
 * 过滤：EMA(fast) 与 EMA(slow) 偏离过大（强趋势）时休眠，避免逆势接刀。
 * 状态：priceHistory 由 SignalHub 维护并传入，本模块只做纯计算 + 冷却计时。
 */

let lastSignalTs = 0;

export function resetMeanReversion(): void {
  lastSignalTs = 0;
}

/** EMA 计算序列（闭式：EMA_t = EMA_{t-1} + α(x - EMA_{t-1})，初始化为首值） */
export function emaSeries(xs: number[], period: number): number[] {
  const out: number[] = [];
  const alpha = 2 / (period + 1);
  let e = xs[0] ?? 0;
  for (const x of xs) {
    e = e + alpha * (x - e);
    out.push(e);
  }
  return out;
}

export function isStrongTrend(xs: number[], fastP = 20, slowP = 60, thresholdPct = 0.4): boolean {
  if (xs.length < slowP) return false;
  const ef = emaSeries(xs, fastP);
  const es = emaSeries(xs, slowP);
  const fast = ef[ef.length - 1];
  const slow = es[es.length - 1];
  return Math.abs((fast - slow) / slow) * 100 >= thresholdPct;
}

export function evaluateMeanReversion(
  book: BookSnapshot,
  history: number[],
  p: MRParams,
  venue: Venue,
): { intent: IntentOrder; trigger: string } | null {
  if (!p.enabled) return null;
  if (history.length < Math.max(p.lookback, 30)) return null;
  if (Date.now() - lastSignalTs < p.cooldownMs) return null;
  if (isStrongTrend(history)) return null; // 趋势过滤：强趋势休眠

  const window = history.slice(-p.lookback);
  const vwap = window.reduce((s, x) => s + x, 0) / window.length;
  const variance = window.reduce((s, x) => s + (x - vwap) ** 2, 0) / window.length;
  const sigma = Math.sqrt(variance);
  if (sigma < 1e-9) return null;

  const mid = (book.bestBid + book.bestAsk) / 2;
  const z = (mid - vwap) / sigma;
  if (Math.abs(z) < p.zEntry) return null;

  const side: "buy" | "sell" = z < 0 ? "buy" : "sell";
  lastSignalTs = Date.now();
  const trigger = `mean-reversion: z=${z.toFixed(2)} (<-${side === "buy" ? "" : "+"}${p.zEntry}σ vs VWAP${p.lookback})`;

  return {
    intent: {
      clientOrderId: `mr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      venue,
      market: book.market,
      side,
      type: "market",
      size: String(p.orderSize),
      price: String(side === "buy" ? book.bestAsk : book.bestBid),
      strategy: "mean-reversion",
      reason: trigger,
    },
    trigger,
  };
}
