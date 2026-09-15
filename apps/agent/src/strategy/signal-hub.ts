import type { BookSnapshot, IntentOrder, StrategyParams, Venue } from "@metrix/shared";
import { evaluateGrid, resetGrid } from "./grid";
import { evaluateMeanReversion, resetMeanReversion } from "./mean-reversion";

/**
 * SignalHub：行情历史 + 多策略组合（方案 §4.1/§4.2）
 * - 维护价格历史（供均值回归/趋势过滤/Perp 趋势模块共享）
 * - 每个 tick 汇总所有启用策略产出的意图订单
 */
export class SignalHub {
  private history: number[] = [];
  private maxHistory = 300;

  push(book: BookSnapshot): void {
    const mid = (book.bestBid + book.bestAsk) / 2;
    this.history.push(mid);
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  get prices(): number[] {
    return this.history;
  }

  reset(): void {
    this.history = [];
    resetGrid();
    resetMeanReversion();
  }

  /** 汇总所有启用策略的意图（现货侧：grid + mean-reversion） */
  evaluateSpot(book: BookSnapshot, params: StrategyParams, venue: Venue): Array<{ intent: IntentOrder; trigger: string }> {
    const out: Array<{ intent: IntentOrder; trigger: string }> = [];
    const g = evaluateGrid(book, params.grid, venue);
    if (g) out.push(g);
    const mr = evaluateMeanReversion(book, this.history, params.mr, venue);
    if (mr) out.push(mr);
    return out;
  }
}
