import type { AgentMode, DecisionEvent } from "@metrix/shared";
import { fillProof } from "@metrix/shared";
import { fmtTime } from "@/lib/api";

export default function DecisionCard({ d, mode = "sim" }: { d: DecisionEvent; mode?: AgentMode }) {
  const proof = fillProof(d, mode);
  const simulated = proof.kind === "simulation";
  const ammQuote = d.book?.quoteSource === "kuru_amm";

  const statusLabel =
    d.status === "executed"
      ? simulated
        ? "模拟成交"
        : "已成交"
      : d.status === "rejected"
        ? "风控拦截"
        : "待处理";

  return (
    <div className="card">
      <div className="decision-head">
        <span className={`badge ${d.intent.side}`}>{d.intent.side.toUpperCase()}</span>
        <span className="badge info">{d.intent.strategy}</span>
        {simulated && <span className="badge sim">Simulation</span>}
        <span className={`badge ${d.status === "executed" ? "ok" : d.status === "rejected" ? "rej" : "info"}`}>
          {statusLabel}
        </span>
        <span className="decision-time">{fmtTime(d.ts)}</span>
      </div>
      <div className="decision-line muted small">触发：{d.trigger}</div>
      <div className="decision-line">{d.summary}</div>
      <div className="decision-line muted small">
        风控：{d.risk.passed ? "✅ 6 项检查通过" : `⛔ [${d.risk.rule}] ${d.risk.detail}`}
      </div>
      {ammQuote && (
        <div className="decision-line muted small">行情来源：Kuru AMM 隐含价（非 CLOB 最优档）</div>
      )}
      {proof.kind === "simulation" && (
        <div className="tx sim" title="本地模拟，无链上交易哈希">
          {proof.label}
        </div>
      )}
      {proof.kind === "onchain" && (
        <a
          className="tx onchain"
          href={proof.url}
          target="_blank"
          rel="noopener noreferrer"
          title={proof.hash}
        >
          {proof.label} ↗
        </a>
      )}
      {proof.kind === "venue_ack" && (
        <div className="tx ack" title={proof.ref}>
          {proof.label}
        </div>
      )}
    </div>
  );
}
