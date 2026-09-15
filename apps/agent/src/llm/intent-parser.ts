import type { ParsedCommand } from "@metrix/shared";

/**
 * 自然语言 → 结构化指令。
 *
 * 当前为离线兜底解析（保证 Demo 不依赖外部服务）。
 * W2/W3 接入 LLM structured output（JSON Schema 强约束）：
 *  - 任何输出必须再经 RiskGate 复核
 *  - LLM 只能调严风控，不能调松
 *  - 所有写操作强制用户确认卡片批准
 */
export function parseIntent(text: string): ParsedCommand {
  const t = text.toLowerCase();
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);

  if (t.includes("平仓") || t.includes("全平") || t.includes("close")) {
    const isAll = t.includes("全平") || t.includes("全部") || t.includes("close all");
    return {
      action: "close_position",
      params: { percent: isAll ? 100 : pct ? Number(pct[1]) : 100 },
      requiresConfirmation: true,
      note: isAll
        ? "识别为全平指令：将市价卖出全部持仓"
        : `识别为平仓指令：卖出 ${pct ? pct[1] : 100}% 持仓`,
    };
  }

  if (t.includes("网格") || t.includes("grid") || t.includes("区间")) {
    const nums = [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    if (nums.length >= 3) {
      return {
        action: "update_strategy",
        params: { lower: nums[0], upper: nums[1], grids: Math.round(nums[2]) },
        requiresConfirmation: true,
        note: `识别为网格参数更新：区间 [${nums[0]}, ${nums[1]}]，${Math.round(nums[2])} 格`,
      };
    }
  }

  if ((t.includes("回撤") || t.includes("风控") || t.includes("risk")) && pct) {
    return {
      action: "set_risk",
      params: { maxDrawdownPct: -Math.abs(Number(pct[1])) / 100 },
      requiresConfirmation: true,
      note: `识别为风控参数更新：最大回撤阈值 ${pct[1]}%（只能调严）`,
    };
  }

  return {
    action: "unknown",
    params: {},
    requiresConfirmation: false,
    note: "未能解析指令。试试：「回撤超过 5% 就全平」或「把网格区间改成 2900 到 3100，10 格」",
  };
}
