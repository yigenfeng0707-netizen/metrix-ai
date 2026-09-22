// Metrix AI 共享类型 —— 前后端唯一事实来源
// 对应完整方案 §4.1–§4.4

export type Venue = "kuru" | "perpl" | "sim";
export type Side = "buy" | "sell";
export type OrderType = "limit" | "market";
export type AgentMode = "sim" | "testnet" | "live";
/** simulation=本地模拟；onchain=Monad 上真实 tx；venue_ack=场内回执（如 Perpl rq，不是链上 hash） */
export type ExecutionKind = "simulation" | "onchain" | "venue_ack";
export type QuoteSource = "sim" | "kuru_l2" | "kuru_amm";

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
  /** 行情来源：sim / Kuru L2 / AMM 隐含价降级。缺省视为未知。 */
  quoteSource?: QuoteSource;
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
  /** 仅 onchain 时应为 0x+64 hex；sim 不得填假 hash；Perpl 网关回执走 venue_ack */
  txHash?: string;
  executionKind?: ExecutionKind;
  fillPrice?: string;
  summary: string;
}

/** 运行时风控限额（只能调严，不能放宽） */
export interface RiskLimits {
  maxOrderPct: number;
  maxExposurePct: number;
  dailyLossHaltPct: number;
  maxDrawdownPct: number;
  maxSlippageBps: number;
  minSecondsBetweenOrders: number;
}

export interface CommandSkip {
  field: string;
  reason: string;
}

/** Chat 确认后的真实落地结果：禁止把空操作报成已执行 */
export interface CommandApplyResult {
  status: "applied" | "partial" | "rejected";
  applied: Record<string, unknown>;
  skipped: CommandSkip[];
  note: string;
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

/** 自然语言指令解析结果（当前为离线正则，不是生产 LLM） */
export interface ParsedCommand {
  action: CommandAction;
  params: Record<string, unknown>;
  requiresConfirmation: boolean;
  note: string;
}

const ONCHAIN_TX = /^0x[0-9a-fA-F]{64}$/;

export function isOnchainTxHash(hash?: string): boolean {
  return typeof hash === "string" && ONCHAIN_TX.test(hash);
}

/** Monad 测试网用 testnet.monadscan.com；主网用 monadscan.com */
export function monadExplorerTxUrl(hash: string, mode: AgentMode): string {
  const host = mode === "live" ? "https://monadscan.com" : "https://testnet.monadscan.com";
  return `${host}/tx/${hash}`;
}

export type FillProof =
  | { kind: "simulation"; label: string }
  | { kind: "onchain"; hash: string; url: string; label: string }
  | { kind: "venue_ack"; ref: string; label: string }
  | { kind: "none" };

function shortRef(s: string): string {
  if (s.length <= 18) return s;
  return `${s.slice(0, 10)}…${s.slice(-8)}`;
}

/**
 * 卡片展示用：sim 永不外链；只有 Kuru 链上 0x hash 才进 MonadScan。
 * 即使历史事件仍带假 0x，只要 venue=sim 也按 Simulation 处理。
 */
export function fillProof(d: Pick<DecisionEvent, "txHash" | "executionKind" | "intent">, mode: AgentMode = "sim"): FillProof {
  const venue = d.intent?.venue;
  const kind = d.executionKind;
  if (kind === "simulation" || venue === "sim") {
    return { kind: "simulation", label: "Simulation · 本地模拟成交，未上链" };
  }
  if (kind === "venue_ack" || venue === "perpl") {
    const ref = d.txHash?.trim() ?? "";
    return {
      kind: "venue_ack",
      ref,
      label: ref
        ? `Perpl 网关回执 ${shortRef(ref)}（非 Monad 链上 hash，不可打开浏览器）`
        : "Perpl 网关回执（非链上 hash）",
    };
  }
  if ((kind === "onchain" || venue === "kuru") && isOnchainTxHash(d.txHash)) {
    const hash = d.txHash as string;
    const net = mode === "live" ? "主网" : "测试网";
    return {
      kind: "onchain",
      hash,
      url: monadExplorerTxUrl(hash, mode),
      label: `tx: ${shortRef(hash)} · MonadScan ${net}`,
    };
  }
  return { kind: "none" };
}
