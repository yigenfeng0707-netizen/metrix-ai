import { randomUUID } from "node:crypto";
import type { DecisionEvent } from "@metrix/shared";
import { config, riskLimits } from "../config";
import { fetchSimBook, fetchTestnetBook } from "../market/kuru-feed";
import { resetGrid } from "../strategy/grid";
import { SignalHub } from "../strategy/signal-hub";
import { evaluatePerpTrend, resetPerpTrend } from "../strategy/perp-trend";
import { evaluateMlSignal, predictUp } from "../strategy/ml-signal";
import { evaluateMmLoop, resetMmLoop } from "../strategy/mm-loop";
import { checkRisk } from "../risk/risk-gate";
import { execute } from "../execution/router";
import { closeAllPositions } from "../execution/sim-adapter";
import { store } from "../store";

/**
 * Agent 主循环：感知 → 决策 → 风控 → 执行 → 审计。
 * 现货：SignalHub 组合网格 + 均值回归（确定性规则）；
 * 永续：Perp 趋势模块（P1，PERPL_ENABLED=true 时启用，走 Perpl WS）。
 */
const hub = new SignalHub();

export function startAgentLoop(): void {
  if (config.mode !== "sim") {
    console.warn(
      "[agent] live 模式：先完成 W1 验证（Kuru 保证金充值 / L2Book 解析 / 测试网小额下单）后再启用真实循环",
    );
  }
  if (config.perpl.enabled) {
    console.log("[agent] Perpl 永续模块已启用（P1）");
  }
  hub.reset();
  resetPerpTrend();

  setInterval(async () => {
    try {
      // ---- R4 兜底：最大回撤强平 ----
      const acc = store.account;
      if (acc.agentStatus === "running" && acc.drawdownPct <= riskLimits.maxDrawdownPct) {
        closeAllPositions();
        store.updateAccount((a) => {
          a.agentStatus = "halted";
        });
        console.warn("[risk] R4 触发：最大回撤强平，Agent 已暂停");
        return;
      }

      // ---- 1. Perceive ----
      const book =
        config.mode === "sim"
          ? fetchSimBook()
          : await fetchTestnetBook(); // testnet/live：Kuru AMM 隐含价格
      hub.push(book);

      // ---- 1b. 网格自动重锚：价格漂出区间（AMM 价格随交易漂移）时，
      // 以当前价为中心平移网格 ----
      const mid = (book.bestBid + book.bestAsk) / 2;
      const span = store.params.grid.upper - store.params.grid.lower;
      if (mid < store.params.grid.lower || mid > store.params.grid.upper) {
        store.params.grid.lower = mid - span / 2;
        store.params.grid.upper = mid + span / 2;
        resetGrid();
      }

      // ---- 2. Decide ----
      const venue = config.mode === "sim" ? "sim" : "kuru";
      const signals: Array<{ intent: import("@metrix/shared").IntentOrder; trigger: string }> = [];
      if (config.mode === "testnet") {
        // testnet：MM 交替循环（AMM 价格只有被交易才动，tick 交替保证持续成交）
        const mm = evaluateMmLoop(book, "kuru");
        if (mm) signals.push(mm);
      } else {
        signals.push(...hub.evaluateSpot(book, store.params, venue));
      }

      // ---- 2b. Perp 趋势模块（P1，可选） ----
      const perp = evaluatePerpTrend(book, hub.prices);
      if (perp) signals.push(perp);

      // ---- 2c. ML 信号策略（PyTorch GPU，可选；服务不可达自动降级） ----
      if (config.ml.enabled && hub.prices.length >= config.ml.minHistory) {
        const pUp = await predictUp(hub.prices);
        if (pUp !== null) {
          const ml = evaluateMlSignal(book, hub.prices, pUp, store.account.vaultUsdc);
          if (ml) signals.push(ml);
        }
      }

      // ---- 3–5. Risk → Act → Audit（逐单处理） ----
      for (const { intent, trigger } of signals) {
        const risk = checkRisk(intent, store.account);
        const base: Omit<DecisionEvent, "status" | "summary"> = {
          id: randomUUID(),
          ts: Date.now(),
          strategy: intent.strategy,
          trigger,
          book,
          intent,
          risk,
        };
        if (!risk.passed) {
          store.recordDecision({
            ...base,
            status: "rejected",
            summary: `风控拦截 [${risk.rule}] ${risk.detail}`,
          });
          continue;
        }
        try {
          const r = await execute(intent);
          store.recordDecision({
            ...base,
            status: r.status,
            txHash: r.txHash,
            fillPrice: r.fillPrice,
            summary: `${intent.side.toUpperCase()} ${intent.size} @ ${r.fillPrice ?? "-"}`,
          });
        } catch (err) {
          store.recordDecision({
            ...base,
            status: "rejected",
            summary: `执行失败：${(err as Error).message}`,
          });
        }
      }
    } catch (err) {
      console.error("[agent] loop error:", err);
    }
  }, config.pollIntervalMs);

  console.log(
    `[agent] loop started: mode=${config.mode}, interval=${config.pollIntervalMs}ms, ` +
      `grid=[${store.params.grid.lower}, ${store.params.grid.upper}], ` +
      `mr=${store.params.mr.enabled ? `on(z>${store.params.mr.zEntry})` : "off"}, ` +
      `perp=${config.perpl.enabled ? "on" : "off"}, ` +
      `ml=${config.ml.enabled ? `on(${config.ml.url})` : "off"}`,
  );
}
