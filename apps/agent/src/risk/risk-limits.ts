import type { CommandApplyResult, CommandSkip, RiskLimits } from "@metrix/shared";

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxOrderPct: 0.05,
  maxExposurePct: 0.3,
  dailyLossHaltPct: -0.03,
  maxDrawdownPct: -0.1,
  maxSlippageBps: 50,
  minSecondsBetweenOrders: 5,
};

/** 可变限额：Chat set_risk 只能调严。测试请 resetRiskLimits()。 */
export const riskLimits: RiskLimits = { ...DEFAULT_RISK_LIMITS };

type FieldSpec = {
  dir: "cap" | "floor";
  min: number;
  max: number;
  label: string;
};

/** cap：越小越严；floor：代数越大越严（负阈值更接近 0、间隔更长） */
const FIELDS: Record<keyof RiskLimits, FieldSpec> = {
  maxOrderPct: { dir: "cap", min: 0.001, max: 1, label: "R1 单笔限额" },
  maxExposurePct: { dir: "cap", min: 0.001, max: 1, label: "R2 单市场敞口" },
  dailyLossHaltPct: { dir: "floor", min: -0.99, max: -0.0001, label: "R3 日亏损熔断" },
  maxDrawdownPct: { dir: "floor", min: -0.99, max: -0.0001, label: "R4 最大回撤" },
  maxSlippageBps: { dir: "cap", min: 1, max: 9999, label: "R5 滑点保护" },
  minSecondsBetweenOrders: { dir: "floor", min: 1, max: 3600, label: "R6 下单间隔" },
};

export function snapshotRiskLimits(): RiskLimits {
  return { ...riskLimits };
}

export function resetRiskLimits(): void {
  Object.assign(riskLimits, DEFAULT_RISK_LIMITS);
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

/**
 * 只允许调严：任何放宽请求记入 skipped，不写回限额。
 * 无法识别的字段标明「暂未生效」，禁止假装已落地。
 */
export function applySetRiskFromParams(params: Record<string, unknown>): CommandApplyResult {
  const applied: Record<string, unknown> = {};
  const skipped: CommandSkip[] = [];

  for (const [rawKey, rawVal] of Object.entries(params)) {
    const key = rawKey as keyof RiskLimits;
    const spec = FIELDS[key];
    if (!spec) {
      skipped.push({ field: rawKey, reason: "暂未生效：该字段尚无安全落地路径" });
      continue;
    }
    const requested = asNumber(rawVal);
    if (requested === null) {
      skipped.push({ field: rawKey, reason: "暂未生效：参数不是有效数字" });
      continue;
    }
    if (requested < spec.min || requested > spec.max) {
      skipped.push({
        field: rawKey,
        reason: `暂未生效：${spec.label} 超出允许区间 [${spec.min}, ${spec.max}]`,
      });
      continue;
    }
    const current = riskLimits[key];
    const tighter = spec.dir === "cap" ? requested <= current : requested >= current;
    if (!tighter) {
      skipped.push({
        field: rawKey,
        reason: `只能调严，不能放宽：当前 ${spec.label} 为 ${fmtField(key, current)}，请求 ${fmtField(key, requested)} 会变松`,
      });
      continue;
    }
    riskLimits[key] = requested;
    applied[rawKey] = requested;
  }

  if (Object.keys(params).length === 0) {
    skipped.push({ field: "*", reason: "暂未生效：未解析到可落地的风控字段" });
  }

  const appliedKeys = Object.keys(applied);
  if (appliedKeys.length === 0) {
    return {
      status: "rejected",
      applied,
      skipped,
      note: skipped[0]?.reason ?? "暂未生效：风控未改动",
    };
  }

  const parts = appliedKeys.map((k) => {
    const key = k as keyof RiskLimits;
    return `${FIELDS[key].label} → ${fmtField(key, applied[k] as number)}`;
  });
  const skipNote = skipped.length ? `；未生效：${skipped.map((s) => s.reason).join("；")}` : "";
  return {
    status: skipped.length ? "partial" : "applied",
    applied,
    skipped,
    note: `已收紧风控（仅当前进程，重启恢复默认）：${parts.join("，")}${skipNote}`,
  };
}

function fmtField(key: keyof RiskLimits, n: number): string {
  if (key === "maxSlippageBps") return `${n} bps`;
  if (key === "minSecondsBetweenOrders") return `${n}s`;
  return fmtPct(n);
}
