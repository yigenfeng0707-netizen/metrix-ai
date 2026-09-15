// Metrix AI 共享类型 —— 前后端唯一事实来源
// 对应完整方案 §4.1–§4.4

export type Venue = "kuru" | "perpl" | "sim";
export type Side = "buy" | "sell";
export type OrderType = "limit" | "market";

/** 执行层统一订单意图：前端/策略/审计不感知底层差异（Kuru or Perpl） */
export interface IntentOrder {
  clientOrderId: string;
  venue: Venue;
  market: string;
  side: Side;
  type: OrderType;
  price?: string;
  size: string;
  strategy: string;
  reason: string;
}

/** 风控闸门裁决 */
export interface RiskVerdict {
  passed: boolean;
  rule?: string;
  detail: string;
}

/** 信号快照（存证与前端展示共用） */
export interface BookSnapshot {
  market: string;
  ts: number;
  bestBid: number;
  bestAsk: number;
}

export type DecisionStatus = "executed" | "rejected" | "pending";

/** 一次完整决策事件：信号 → 意图 → 风控 → 结果 */
export interface DecisionEvent {
  id: string;
  ts: number;
  strategy: string;
  trigger: string;
  book: BookSnapshot;
  intent: IntentOrder;
  risk: RiskVerdict;
  status: DecisionStatus;
  txHash?: string;
  fillPrice?: string;
  summary: string;
}

export interface Position {
  market: string;
  venue: Venue;
  size: number;
  avgCost: number;
  markPrice: number;
}

export interface AccountState {
  vaultUsdc: number;
  positions: Position[];
  dayPnl: number;
  highWater: number;
  drawdownPct: number;
  agentStatus: "running" | "halted" | "paused";
}

export interface GridParams {
  enabled: boolean;
  lower: number;
  upper: number;
  grids: number;
  orderSize: number;
}

/** 均值回归 + 趋势过滤参数（方案 §4.2 策略 B） */
export interface MRParams {
  enabled: boolean;
  /** 价格历史窗口（tick 数，用于 VWAP/σ 与 EMA） */
  lookback: number;
  /** 入场 z-score 阈值（偏离 VWAP 几个标准差） */
  zEntry: number;
  orderSize: number;
  /** 两次信号最小间隔 ms */
  cooldownMs: number;
}

/** 策略参数集合（前后端共用） */
export interface StrategyParams {
  grid: GridParams;
  mr: MRParams;
}

export type CommandAction =
  | "update_strategy"
  | "close_position"
  | "set_risk"
  | "unknown";

/** 自然语言指令解析结果（LLM 结构化输出 Schema，见方案 §4.5） */
export interface ParsedCommand {
  action: CommandAction;
  params: Record<string, unknown>;
  requiresConfirmation: boolean;
  note: string;
}
