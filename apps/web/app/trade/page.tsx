"use client";

import { useEffect, useState } from "react";
import type { DecisionEvent } from "@metrix/shared";
import { getDecisions } from "@/lib/api";
import { useAgentStream } from "@/lib/useAgentStream";
import DecisionCard from "@/components/DecisionCard";

export default function TradePage() {
  const [decisions, setDecisions] = useState<DecisionEvent[] | null>(null);

  useEffect(() => {
    getDecisions(50).then(setDecisions);
  }, []);

  useAgentStream((d) => {
    setDecisions((prev) => [d, ...(prev ?? [])].slice(0, 100));
  });

  return (
    <>
      <h1>实时决策流</h1>
      <p className="subtitle">
        每笔交易可审计：信号快照 → 决策 → 风控检查 → 链上凭证
      </p>
      {decisions === null && <p className="muted">加载中…</p>}
      {decisions?.length === 0 && (
        <p className="muted">
          暂无决策。Agent 每 3 秒评估一次行情，价格穿越网格线时会产生交易。
        </p>
      )}
      {decisions?.map((d) => <DecisionCard key={d.id} d={d} />)}
    </>
  );
}
