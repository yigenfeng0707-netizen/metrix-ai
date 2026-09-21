import type { AccountState, IntentOrder, RiskVerdict } from "@metrix/shared";
import { riskLimits } from "../config";
import { store } from "../store";

function fail(rule: string, detail: string): RiskVerdict {
  return { passed: false, rule, detail };
}

/**
 * 风控闸门：6 条硬规则（对应完整方案 §4.3）。
 * 每条意图订单必须通过全部检查才能进入执行层。
 * 用户 UI 只能调严、不能调松超过这里的上限。
 */
export function checkRisk(intent: IntentOrder, account: AccountState): RiskVerdict {
  const eq = store.equity();
  const price = Number(intent.price ?? 0);
  const notional = Number(intent.size) * price;

  // R6 幂等
  if (store.seenClientIds.has(intent.clientOrderId)) {
    return fail("R6-duplicate", "clientOrderId 已存在，拒绝重复提交");
  }
  // R6 频率
  if (Date.now() - store.recentOrderTs < riskLimits.minSecondsBetweenOrders * 1000) {
    return fail("R6-frequency", `同市场 ${riskLimits.minSecondsBetweenOrders}s 内限 1 单`);
  }
  // R4 状态：已熔断暂停
  if (account.agentStatus === "halted") {
    return fail("R4-halted", "最大回撤熔断中，Agent 已暂停");
  }
  // R3 日亏损熔断：当日亏损达阈值后禁止开新仓（只允许平仓）
  if (
    intent.side === "buy" &&
    eq > 0 &&
    account.dayPnl / eq <= riskLimits.dailyLossHaltPct
  ) {
    return fail("R3-daily-loss", `当日亏损 ${(account.dayPnl / eq * 100).toFixed(2)}% 已触发熔断，禁止开新仓`);
  }
  // R1 单笔限额
  if (notional > eq * riskLimits.maxOrderPct) {
    return fail("R1-order-cap", `单笔 $${notional.toFixed(2)} 超过净值 ${(riskLimits.maxOrderPct * 100).toFixed(0)}% 上限`);
  }
  // R2 单市场敞口
  const current = account.positions
    .filter((p) => p.market === intent.market)
    .reduce((s, p) => s + p.size * p.markPrice, 0);
  const exposure = current + (intent.side === "buy" ? notional : 0);
  if (exposure > eq * riskLimits.maxExposurePct) {
    return fail("R2-exposure", `该市场敞口将达 $${exposure.toFixed(2)}，超过净值 ${(riskLimits.maxExposurePct * 100).toFixed(0)}% 上限`);
  }
  // R5 滑点保护：Kuru 执行路径在 router → computeMinAmountOut 用 CostEstimator 写入链上 minAmountOut
  return { passed: true, detail: "all checks passed" };
}

export function markOrderSent(clientOrderId: string): void {
  store.seenClientIds.add(clientOrderId);
  store.recentOrderTs = Date.now();
}
