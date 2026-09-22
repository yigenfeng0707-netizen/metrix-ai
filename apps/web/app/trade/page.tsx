"use client";

import { useEffect, useState } from "react";
import type { AgentMode, DecisionEvent } from "@metrix/shared";
import { getDecisions, getOverview } from "@/lib/api";
import { useAgentStream } from "@/lib/useAgentStream";
import DecisionCard from "@/components/DecisionCard";
import ModeBanner from "@/components/ModeBanner";

export default function TradePage() {
  const [decisions, setDecisions] = useState<DecisionEvent[] | null>(null);
  const [mode, setMode] = useState<AgentMode>("sim");

  useEffect(() => {
    getDecisions(50).then(setDecisions).catch(() => setDecisions([]));
    getOverview()
      .then((o) => setMode(o.mode ?? "sim"))
      .catch(() => setMode("sim"));
  }, []);

  useAgentStream((d) => {
    setDecisions((prev) => [d, ...(prev ?? [])].slice(0, 100));
  });

  return (
    <>
      <h1>实时决策流</h1>
      <ModeBanner mode={mode} quoteSource={decisions?.[0]?.book?.quoteSource} />
      {decisions === null && <p className="muted">加载中…</p>}
      {decisions?.length === 0 && (
        <p className="muted">
          暂无决策。Agent 每 3 秒评估一次行情，价格穿越网格线时会产生交易。
        </p>
      )}
      {decisions?.map((d) => (
        <DecisionCard key={d.id} d={d} mode={mode} />
      ))}
    </>
  );
}
