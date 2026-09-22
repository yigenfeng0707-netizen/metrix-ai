import type { CommandApplyResult, GridParams, ParsedCommand } from "@metrix/shared";
import { store } from "../store";
import { closeAllPositions } from "../execution/sim-adapter";
import { applySetRiskFromParams } from "../risk/risk-limits";

function ok(note: string, applied: Record<string, unknown> = {}): CommandApplyResult {
  return { status: "applied", applied, skipped: [], note };
}

export function applyParsedCommand(parsed: ParsedCommand): CommandApplyResult {
  if (parsed.action === "update_strategy") {
    const p = parsed.params as Partial<GridParams>;
    const prev = { ...store.params.grid };
    const applied: Record<string, unknown> = {};
    if (typeof p.lower === "number") {
      store.params.grid.lower = p.lower;
      applied.lower = p.lower;
    }
    if (typeof p.upper === "number") {
      store.params.grid.upper = p.upper;
      applied.upper = p.upper;
    }
    if (typeof p.grids === "number") {
      store.params.grid.grids = Math.max(2, Math.round(p.grids));
      applied.grids = store.params.grid.grids;
    }
    if (store.params.grid.upper <= store.params.grid.lower) {
      Object.assign(store.params.grid, prev);
      return {
        status: "rejected",
        applied: {},
        skipped: [{ field: "grid", reason: "暂未生效：上限必须大于下限" }],
        note: "暂未生效：网格上限必须大于下限",
      };
    }
    if (Object.keys(applied).length === 0) {
      return {
        status: "rejected",
        applied: {},
        skipped: [{ field: "grid", reason: "暂未生效：未解析到网格参数" }],
        note: "暂未生效：未解析到可写入的网格参数",
      };
    }
    return ok(
      `已更新网格：区间 [${store.params.grid.lower}, ${store.params.grid.upper}]，${store.params.grid.grids} 格`,
      applied,
    );
  }

  if (parsed.action === "set_risk") {
    const r = applySetRiskFromParams(parsed.params);
    if (r.status !== "rejected") store.updateAccount(() => {});
    return r;
  }

  if (parsed.action === "close_position") {
    closeAllPositions();
    const pct = parsed.params.percent;
    const partial = typeof pct === "number" && pct < 100;
    if (partial) {
      return {
        status: "partial",
        applied: { closed: true },
        skipped: [{ field: "percent", reason: `暂未生效：按比例平仓尚未实现，本次已全平（请求 ${pct}%）` }],
        note: `已全平并暂停 Agent；按比例 ${pct}% 平仓暂未生效`,
      };
    }
    return ok("已市价卖出全部持仓并暂停 Agent", { closed: true });
  }

  return {
    status: "rejected",
    applied: {},
    skipped: [{ field: "*", reason: "暂未生效：未能识别可执行指令" }],
    note: "暂未生效：未能识别可执行指令",
  };
}
