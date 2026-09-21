import { AGENT_URL, httpToWs } from "./api";
import type { AccountState, DecisionEvent } from "@metrix/shared";
import { useEffect } from "react";

/** 订阅 Agent 的实时推送（决策流 + 账户状态） */
export function useAgentStream(
  onData: (d: DecisionEvent) => void,
  onAccount?: (a: AccountState) => void,
): void {
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;

    const connect = () => {
      const httpBase =
        AGENT_URL ||
        (typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.host}`
          : "http://127.0.0.1:8787");
      ws = new WebSocket(`${httpToWs(httpBase)}/ws`);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as { type: string; payload: unknown };
          if (msg.type === "decision") onData(msg.payload as DecisionEvent);
          if (msg.type === "account" && onAccount) onAccount(msg.payload as AccountState);
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000); // 断线重连
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
