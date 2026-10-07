"use client";

import { useEffect, useState } from "react";
import { getPerplStatus, getRiskSnapshot, type PerplReadiness, type RiskSnapshot } from "@/lib/api";

/**
 * Perpl Analytics / Risk 证据面板：公开行情 + RiskGate 最近裁决 + 真成交就绪状态。
 * 不假装已有 Perpl fill。
 */
export default function PerplRiskPanel({ compact = false }: { compact?: boolean }) {
  const [perpl, setPerpl] = useState<PerplReadiness | null>(null);
  const [risk, setRisk] = useState<RiskSnapshot | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([getPerplStatus(), getRiskSnapshot()])
      .then(([p, r]) => {
        setPerpl(p);
        setRisk(r);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  if (err) {
    return (
      <div className="card">
        <span className="badge rej">Perpl / Risk</span>
        <p className="small muted" style={{ marginTop: 8 }}>
          看板暂不可用：{err}
        </p>
      </div>
    );
  }

  if (!perpl || !risk) {
    return <p className="muted small">加载 Perpl / Risk 看板…</p>;
  }

  const mkt = perpl.public.selectedMarket;
  const candle = perpl.public.lastCandle;

  return (
    <div className="card kuru-evidence">
      <div className="row" style={{ marginBottom: compact ? 6 : 10 }}>
        <span className={`badge ${perpl.liveTradeReady ? "ok" : "info"}`}>
          Perpl · {perpl.public.network}
        </span>
        <span className="muted small">
          {perpl.liveTradeReady ? "配置就绪，可试 IOC" : "公开行情 + 风控证据（真成交未验证）"}
        </span>
      </div>

      <div className="grid2" style={{ marginBottom: 10 }}>
        <div>
          <div className="stat-label">市场</div>
          <div className="small">
            {mkt ? `${mkt.name} (#${mkt.id})` : "—"}
            {candle ? (
              <span className="muted"> · last {candle.c}</span>
            ) : null}
          </div>
        </div>
        <div>
          <div className="stat-label">RiskGate</div>
          <div className="small">
            DD {(risk.account.drawdownPct * 100).toFixed(2)}% ·{" "}
            {risk.account.agentStatus} · {risk.account.positionCount} pos
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div className="stat-label" style={{ marginBottom: 6 }}>
            就绪检查
          </div>
          <ul className="evidence-list" style={{ marginBottom: 10 }}>
            <li>
              <span className="evidence-label">Public API</span>
              <span className={`badge ${perpl.publicOk ? "ok" : "rej"}`}>
                {perpl.publicOk ? "OK" : "DOWN"}
              </span>
            </li>
            <li>
              <span className="evidence-label">API Key</span>
              <span className={`badge ${perpl.hasApiKey ? "ok" : "sim"}`}>
                {perpl.hasApiKey ? "SET" : "MISSING"}
              </span>
            </li>
            <li>
              <span className="evidence-label">Account ID</span>
              <span className={`badge ${perpl.hasAccountId ? "ok" : "sim"}`}>
                {perpl.hasAccountId ? "SET" : "0"}
              </span>
            </li>
            <li>
              <span className="evidence-label">PERPL_ENABLED</span>
              <span className={`badge ${perpl.enabled ? "ok" : "sim"}`}>
                {perpl.enabled ? "true" : "false"}
              </span>
            </li>
          </ul>
        </>
      )}

      <div className="stat-label" style={{ marginBottom: 6 }}>
        最近风控裁决
      </div>
      <ul className="evidence-list">
        {risk.recentVerdicts.slice(0, compact ? 4 : 6).map((v) => (
          <li key={v.id}>
            <span className="evidence-label">
              {v.strategy} · {v.venue}
            </span>
            <span className={`badge ${v.passed ? "ok" : "rej"}`}>
              {v.passed ? "PASS" : v.rule ?? "REJECT"}
            </span>
          </li>
        ))}
        {risk.recentVerdicts.length === 0 && (
          <li>
            <span className="muted small">尚无裁决；Agent 循环开始后会出现</span>
          </li>
        )}
      </ul>

      {!compact && perpl.blockers.length > 0 && (
        <p className="muted small" style={{ marginTop: 10 }}>
          真成交阻塞：{perpl.blockers[0]}
          {perpl.blockers.length > 1 ? `（另有 ${perpl.blockers.length - 1} 项）` : ""}
        </p>
      )}
    </div>
  );
}
