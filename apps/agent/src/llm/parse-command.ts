import type { ParsedCommand } from "@metrix/shared";
import { config } from "../config";
import { parseIntent } from "./intent-parser";
import { completeChat, extractJsonObject, llmConfigured, modelPayloadOk } from "./modelscope";

const SYSTEM = `You convert one trading-agent instruction into a single JSON object.
Allowed action values: "update_strategy", "close_position", "set_risk", "unknown".
- update_strategy params: lower, upper, grids (numbers). Use this for grid range changes.
- close_position params: percent (number, 100 means close everything). Use this only for an immediate close.
- set_risk params: maxDrawdownPct as a negative fraction. "回撤超过 5% 就全平" means tighten the drawdown limit to -0.05, not an immediate close.
- unknown when the sentence is not one of those commands.
note: one short Chinese sentence describing what you understood.
Return JSON only. No markdown.`;

export type ParserName = "modelscope" | "offline-regex";

export interface ParseResult {
  parsed: ParsedCommand;
  parser: ParserName;
  model: string | null;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

/** Turn a model JSON object into a command. Returns null when the shape is unusable. */
export function commandFromModelJson(value: unknown): ParsedCommand | null {
  if (!modelPayloadOk(value)) return null;
  const paramsIn = (value.params ?? {}) as Record<string, unknown>;
  const params: Record<string, unknown> = {};

  if (value.action === "update_strategy") {
    const lower = num(paramsIn.lower);
    const upper = num(paramsIn.upper);
    const grids = num(paramsIn.grids);
    if (lower === undefined || upper === undefined || grids === undefined) return null;
    params.lower = lower;
    params.upper = upper;
    params.grids = Math.round(grids);
  } else if (value.action === "close_position") {
    const percent = num(paramsIn.percent);
    params.percent = percent === undefined ? 100 : Math.min(100, Math.max(1, percent));
  } else if (value.action === "set_risk") {
    let dd = num(paramsIn.maxDrawdownPct);
    if (dd === undefined) return null;
    if (Math.abs(dd) > 1) dd = -Math.abs(dd) / 100;
    else dd = -Math.abs(dd);
    params.maxDrawdownPct = dd;
  }

  return {
    action: value.action as ParsedCommand["action"],
    params,
    requiresConfirmation: value.action !== "unknown",
    note: value.note.trim(),
  };
}

export async function parseCommand(text: string): Promise<ParseResult> {
  const safety = parseIntent(text);
  if (!llmConfigured()) {
    return { parsed: safety, parser: "offline-regex", model: null };
  }

  try {
    const content = await completeChat(SYSTEM, text);
    const parsed = commandFromModelJson(extractJsonObject(content));
    if (!parsed) throw new Error("modelscope_bad_json");
    // A drawdown-limit sentence must stay set_risk even if the model says close.
    if (safety.action === "set_risk" && parsed.action !== "set_risk") {
      return { parsed: safety, parser: "modelscope", model: config.llmModel };
    }
    return { parsed, parser: "modelscope", model: config.llmModel };
  } catch {
    return {
      parsed: {
        ...safety,
        note: `${safety.note}（魔搭暂不可用，已用规则解析）`,
      },
      parser: "offline-regex",
      model: config.llmModel,
    };
  }
}
