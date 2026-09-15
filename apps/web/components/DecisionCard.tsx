import type { DecisionEvent } from "@metrix/shared";
import { fmtTime } from "@/lib/api";

export default function DecisionCard({ d }: { d: DecisionEvent }) {
  return (
    <div className="card">
      <div className="decision-head">
        <span className={`badge ${d.intent.side}`}>{d.intent.side.toUpperCase()}</span>
        <span className="badge info">{d.intent.strategy}</span>
        <span className={`badge ${d.status === "executed" ? "ok" : d.status === "rejected" ? "rej" : "info"}`}>
          {d.status === "executed" ? "已成交" : d.status === "rejected" ? "风控拦截" : "待处理"}
        </span>
        <span className="decision-time">{fmtTime(d.ts)}</span>
      </div>
      <div className="decision-line muted small">触发：{d.trigger}</div>
      <div className="decision-line">{d.summary}</div>
      <div className="decision-line muted small">
        风控：{d.risk.passed ? "✅ 6 项检查通过" : `⛔ [${d.risk.rule}] ${d.risk.detail}`}
      </div>
      {d.txHash && (
        <div className="tx mono" title={d.txHash}>
          tx: {d.txHash.slice(0, 10)}…{d.txHash.slice(-8)} ↗
        </div>
      )}
    </div>
  );
}
