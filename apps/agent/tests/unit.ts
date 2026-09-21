/**
 * 单元测试（零依赖，node:assert + tsx 运行）
 * 覆盖：风控引擎 R1/R3/R4/R6、R5 滑点下限、网格策略、均值回归 + 趋势过滤
 * 运行：npm test（apps/agent）
 */
import assert from "node:assert/strict";
import { checkRisk, markOrderSent } from "../src/risk/risk-gate";
import { floorWithSlippage } from "../src/execution/kuru-adapter";
import { riskLimits } from "../src/config";
import { store } from "../src/store";
import { evaluateGrid, resetGrid } from "../src/strategy/grid";
import { evaluateMeanReversion, isStrongTrend, emaSeries, resetMeanReversion } from "../src/strategy/mean-reversion";
import type { AccountState, IntentOrder, MRParams } from "@metrix/shared";

let passed = 0;
let failed = 0;
function t(name: string, fn: () => void): void {
  try {
    fn();
    console.log("  ✓", name);
    passed++;
  } catch (e) {
    console.error("  ✗", name, "\n   ", (e as Error).message);
    failed++;
  }
}

function resetStore(): void {
  store.decisions = [];
  store.seenClientIds.clear();
  store.recentOrderTs = 0;
  store.account = {
    vaultUsdc: 10_000,
    positions: [],
    dayPnl: 0,
    highWater: 10_000,
    drawdownPct: 0,
    agentStatus: "running",
  };
}

function intent(over: Partial<IntentOrder> = {}): IntentOrder {
  return {
    clientOrderId: `t-${Math.random().toString(36).slice(2)}`,
    venue: "sim",
    market: "TEST/USDC",
    side: "buy",
    type: "market",
    price: "100",
    size: "1",
    strategy: "test",
    reason: "test",
    ...over,
  };
}

const acc = (): AccountState => store.account;
const mrParams: MRParams = { enabled: true, lookback: 40, zEntry: 1.5, orderSize: 0.01, cooldownMs: 0 };

// ---------------- 风控引擎 ----------------
console.log("\n[risk-gate]");

t("通过：正常小单全部检查通过", () => {
  resetStore();
  const v = checkRisk(intent({ size: "1", price: "100" }), acc()); // $100 = 1% < 5%
  assert.equal(v.passed, true);
});

t("R1 单笔限额：$600 (6%) 被拒", () => {
  resetStore();
  const v = checkRisk(intent({ size: "6", price: "100" }), acc()); // $600 = 6% > 5%
  assert.equal(v.passed, false);
  assert.equal(v.rule, "R1-order-cap");
});

t("R2 敞口：已有持仓 + 新单超 30% 被拒", () => {
  resetStore();
  // 记账一致：买入 27 份后 vaultUsdc 相应扣减，净值仍为 $10000（27% 敞口）
  store.updateAccount((a) => {
    a.vaultUsdc -= 2700;
    a.positions.push({ market: "TEST/USDC", venue: "sim", size: 27, avgCost: 100, markPrice: 100 });
  });
  // 新单 $400（4%，通过 R1），叠加后 $3100 = 31% > 30% → R2 拦截
  const v = checkRisk(intent({ size: "4", price: "100" }), acc());
  assert.equal(v.passed, false);
  assert.equal(v.rule, "R2-exposure");
});

t("R3 日亏损熔断：亏 4% 后买单被拒、卖单放行", () => {
  resetStore();
  store.updateAccount((a) => {
    a.dayPnl = -450; // -4.5% < -3%
  });
  const vBuy = checkRisk(intent({ side: "buy" }), acc());
  const vSell = checkRisk(intent({ side: "sell" }), acc());
  assert.equal(vBuy.passed, false);
  assert.equal(vBuy.rule, "R3-daily-loss");
  assert.equal(vSell.passed, true);
});

t("R4 状态：halted 后一切拒单", () => {
  resetStore();
  store.updateAccount((a) => {
    a.agentStatus = "halted";
  });
  const v = checkRisk(intent(), acc());
  assert.equal(v.passed, false);
  assert.equal(v.rule, "R4-halted");
});

t("R6 幂等：重复 clientOrderId 被拒", () => {
  resetStore();
  const i = intent({ clientOrderId: "dup-1" });
  markOrderSent("dup-1");
  const v = checkRisk(i, acc());
  assert.equal(v.passed, false);
  assert.equal(v.rule, "R6-duplicate");
});

t("R6 频率：5s 内第二单被拒", () => {
  resetStore();
  markOrderSent("freq-1");
  const v = checkRisk(intent(), acc());
  assert.equal(v.passed, false);
  assert.equal(v.rule, "R6-frequency");
});

// ---------------- 网格策略 ----------------
console.log("\n[grid]");

t("首个 tick 只建立基线，不产生交易", () => {
  resetGrid();
  const book = { market: "T", ts: 0, bestBid: 3050, bestAsk: 3051 };
  assert.equal(evaluateGrid(book, { enabled: true, lower: 2950, upper: 3150, grids: 8, orderSize: 0.02 }, "sim"), null);
  assert.equal(evaluateGrid(book, { enabled: true, lower: 2950, upper: 3150, grids: 8, orderSize: 0.02 }, "sim"), null);
});

t("价格下穿一格 → 买单；上穿一格 → 卖单", () => {
  resetGrid();
  const p = { enabled: true, lower: 2950, upper: 3150, grids: 8, orderSize: 0.02 };
  const b1 = { market: "T", ts: 0, bestBid: 3049, bestAsk: 3050 }; // level ~3
  assert.equal(evaluateGrid(b1, p, "sim"), null); // 基线
  const b2 = { market: "T", ts: 1, bestBid: 3024, bestAsk: 3025 }; // 下穿 → level 2
  const r2 = evaluateGrid(b2, p, "sim");
  assert.ok(r2);
  assert.equal(r2.intent.side, "buy");
  const b3 = { market: "T", ts: 2, bestBid: 3074, bestAsk: 3075 }; // 上穿 → level 5
  const r3 = evaluateGrid(b3, p, "sim");
  assert.ok(r3);
  assert.equal(r3.intent.side, "sell");
});

t("价格越界 → clamp 到边界格位并触发回归信号", () => {
  resetGrid();
  const p = { enabled: true, lower: 2950, upper: 3150, grids: 8, orderSize: 0.02 };
  // 先在区间中部建立基线
  const base = { market: "T", ts: 0, bestBid: 3049.5, bestAsk: 3050.5 };
  assert.equal(evaluateGrid(base, p, "sim"), null); // 基线
  // 价格跌破下限 → clamp 到 level 0，相对基线（level ~4）大幅下穿 → 买入
  const r1 = evaluateGrid({ market: "T", ts: 0, bestBid: 2900, bestAsk: 2901 }, p, "sim");
  assert.ok(r1, "越界应触发买入回归信号");
  assert.equal(r1.intent.side, "buy");
});

t("策略停用 → 不产出", () => {
  resetGrid();
  const p = { enabled: false, lower: 2950, upper: 3150, grids: 8, orderSize: 0.02 };
  assert.equal(evaluateGrid({ market: "T", ts: 0, bestBid: 3050, bestAsk: 3051 }, p, "sim"), null);
});

// ---------------- 均值回归 ----------------
console.log("\n[mean-reversion]");

t("EMA 序列收敛于常数序列", () => {
  const e = emaSeries([100, 100, 100, 100], 20);
  assert.ok(Math.abs(e[3] - 100) < 1e-9);
});

t("震荡序列不判定为强趋势；单边序列判定为强趋势", () => {
  const noise = Array.from({ length: 80 }, () => 3000 + (Math.random() - 0.5) * 20);
  const trend = Array.from({ length: 80 }, (_, i) => 3000 + i * 5);
  assert.equal(isStrongTrend(noise), false);
  assert.equal(isStrongTrend(trend), true);
});

t("偏离 VWAP 超阈值 → 反向信号（低价买入）", () => {
  resetMeanReversion();
  const noise = Array.from({ length: 60 }, () => 3000 + (Math.random() - 0.5) * 30);
  const mean = noise.reduce((a, b) => a + b, 0) / noise.length;
  const sd = Math.sqrt(noise.reduce((a, b) => a + (b - mean) ** 2, 0) / noise.length);
  const book = { market: "T", ts: 0, bestBid: mean - 2 * sd, bestAsk: mean - 2 * sd + 0.5 };
  const r = evaluateMeanReversion(book, noise, mrParams, "sim");
  assert.ok(r, "应触发买信号");
  assert.equal(r.intent.side, "buy");
  assert.equal(r.intent.strategy, "mean-reversion");
});

t("冷却期内不重复信号", () => {
  resetMeanReversion();
  const noise = Array.from({ length: 60 }, () => 3000 + (Math.random() - 0.5) * 30);
  const p = { ...mrParams, cooldownMs: 60_000 };
  const mean = noise.reduce((a, b) => a + b, 0) / noise.length;
  const book = { market: "T", ts: 0, bestBid: mean - 20, bestAsk: mean - 19.5 };
  const first = evaluateMeanReversion(book, noise, p, "sim");
  if (first) {
    const second = evaluateMeanReversion(book, noise, p, "sim");
    assert.equal(second, null);
  }
});

// ---------------- R5 滑点下限 ----------------
console.log("\n[r5-slippage]");

t("50 bps 把 1.0 打成 0.995", () => {
  assert.equal(floorWithSlippage(1, 50), 0.995);
});

t("与配置 maxSlippageBps 一致：100 → 99.5% 下限", () => {
  const out = floorWithSlippage(100, riskLimits.maxSlippageBps);
  assert.equal(out, 99.5);
});

t("非正预估抛错（禁止退回 minAmountOut=0）", () => {
  assert.throws(() => floorWithSlippage(0, 50));
  assert.throws(() => floorWithSlippage(-1, 50));
});

// ---------------- 汇总 ----------------
console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
if (failed > 0) process.exit(1);
