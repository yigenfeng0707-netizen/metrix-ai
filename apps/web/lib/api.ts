import type { AccountState, DecisionEvent, GridParams, MRParams } from "@metrix/shared";

export const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8787";

export function httpToWs(url: string): string {
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
}

export async function getOverview(): Promise<Overview> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/overview`, { cache: "no-store" });
  return r.json();
}

export async function getDecisions(limit = 50): Promise<DecisionEvent[]> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/decisions?limit=${limit}`, { cache: "no-store" });
  return r.json();
}

export async function postCommand(text: string): Promise<{ id: string; parsed: { action: string; note: string; requiresConfirmation: boolean } }> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return r.json();
}

export async function confirmCommand(id: string): Promise<{ id: string; status: string; applied: { note: string } }> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/command/${id}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return r.json();
}

export async function updateStrategy(params: Partial<GridParams>): Promise<GridParams> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/strategy`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return r.json();
}

export async function updateMr(params: Partial<MRParams>): Promise<MRParams> {
  const r = await fetch(`${AGENT_URL}/vaults/demo/mr`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return r.json();
}

export function fmtUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour12: false });
}
