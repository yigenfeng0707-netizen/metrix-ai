import type {
  AccountState,
  AgentMode,
  CommandApplyResult,
  DecisionEvent,
  GridParams,
  MRParams,
  ParsedCommand,
  RiskLimits,
} from "@metrix/shared";

/**
 * 浏览器访问 Agent 的基址。
 * - 本地：默认 http://localhost:8787（可用 NEXT_PUBLIC_AGENT_URL 覆盖）
 * - 魔搭 Docker：构建时 NEXT_PUBLIC_AGENT_URL=""，请求走同域 /vaults 与 /ws（next rewrites）
 */
export const AGENT_URL = (
  process.env.NEXT_PUBLIC_AGENT_URL !== undefined
    ? process.env.NEXT_PUBLIC_AGENT_URL
    : "http://localhost:8787"
).replace(/\/$/, "");

export function httpToWs(url: string): string {
  if (!url) return "";
  return url.replace(/^http/, "ws");
}

export interface Overview {
  vault: { id: string; name: string; agent: string };
  account: AccountState;
  equity: number;
  strategy: GridParams;
  mr: MRParams;
  perp: { enabled: boolean; side: string };
  stats: { totalDecisions: number };
  db: { persisted: boolean; decisions: number; orders: number } | null;
  mode?: AgentMode;
  riskLimits?: RiskLimits;
  llm?: { production: boolean; parser: string; model?: string | null };
}

async function readJson<T>(r: Response): Promise<T> {
  const body = (await r.json().catch(() => ({}))) as T & { error?: string; ok?: boolean };
  if (!r.ok || (body && typeof body === "object" && typeof body.error === "string" && body.error)) {
    const msg = typeof body.error === "string" ? body.error : `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export async function getOverview(): Promise<Overview> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/overview`, { cache: "no-store" });
  return readJson<Overview>(r);
}

export async function getDecisions(limit = 50): Promise<DecisionEvent[]> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/decisions?limit=${limit}`, { cache: "no-store" });
  return readJson<DecisionEvent[]>(r);
}

export async function postCommand(text: string): Promise<{
  id: string;
  parsed: ParsedCommand;
  parser?: string;
  model?: string | null;
}> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return readJson(r);
}

export async function confirmCommand(id: string): Promise<{
  id: string;
  status: string;
  applied: ParsedCommand;
  result?: CommandApplyResult;
}> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/command/${id}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return readJson(r);
}

export async function updateStrategy(params: Partial<GridParams>): Promise<GridParams> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/strategy`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return readJson<GridParams>(r);
}

export async function updateMr(params: Partial<MRParams>): Promise<MRParams> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/mr`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return readJson<MRParams>(r);
}

export function fmtUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour12: false });
}
