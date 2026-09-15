"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AccountState } from "@metrix/shared";
import { getOverview, fmtUsd, type Overview } from "@/lib/api";
import { useAgentStream } from "@/lib/useAgentStream";
import Sparkline from "@/components/Sparkline";

export default function HomePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [account, setAccount] = useState<AccountState | null>(null);
  const [equityHistory, setEquityHistory] = useState<number[]>([]);

  useEffect(() => {
    getOverview().then((d) => {
      setData(d);
      setAccount(d.account);
      setEquityHistory([d.equity]);
    });
  }, []);

  useAgentStream(() => {
    getOverview().then((d) => {
      setAccount(d.account);
      setEquityHistory((h) => [...h.slice(-60), d.equity]);
    });
  });

  if (!data || !account) return <p className="muted">连接 Agent 中…（请确认后端已启动：npm run dev:agent）</p>;

  const dayPnlPct = data.equity > 0 ? (account.dayPnl / data.equity) * 100 : 0;

  return (
    <>
      <h1>{data.vault.name}</h1>
      <p className="subtitle">
        {data.vault.agent} ·{" "}
        <span className={`badge ${account.agentStatus === "running" ? "ok" : "rej"}`}>
          {account.agentStatus === "running" ? "运行中" : account.agentStatus === "halted" ? "已熔断" : "已暂停"}
        </span>
      </p>

      <div className="card">
        <div className="stat-label">金库净值（含持仓）</div>
        <div className="stat-value">{fmtUsd(data.equity)}</div>
        <div style={{ marginTop: 8 }}>
          <Sparkline data={equityHistory} />
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="stat-label">可用资金 (USDC)</div>
          <div className="stat-value">{fmtUsd(account.vaultUsdc)}</div>
        </div>
        <div className="card">
          <div className="stat-label">今日盈亏</div>
          <div className={`stat-value ${account.dayPnl >= 0 ? "pos" : "neg"}`}>
            {account.dayPnl >= 0 ? "+" : ""}
            {fmtUsd(account.dayPnl)}{" "}
            <span className="small">({dayPnlPct.toFixed(2)}%)</span>
          </div>
        </div>
        <div className="card">
          <div className="stat-label">当前回撤（高水位法）</div>
          <div className={`stat-value ${account.drawdownPct > -0.05 ? "pos" : "neg"}`}>
            {(account.drawdownPct * 100).toFixed(2)}%
          </div>
          <div className="muted small">-10% 触发强平熔断</div>
        </div>
        <div className="card">
          <div className="stat-label">累计决策数</div>
          <div className="stat-value">{data.stats.totalDecisions}</div>
          <div className="muted small">
            网格 [{data.strategy.lower}, {data.strategy.upper}]
          </div>
        </div>
      </div>

      <div className="card row">
        <span className="muted">PostgreSQL 落库</span>
        <span className="small">
          {data.db ? (
            <>✅ 已持久化 <b className="mono">{data.db.decisions}</b> 条决策 / <b className="mono">{data.db.orders}</b> 笔订单</>
          ) : (
            "未启用（纯内存模式）"
          )}
        </span>
      </div>

      <h2>快捷操作</h2>
      <div className="grid2">
        <Link href="/trade" className="btn full" style={{ textAlign: "center" }}>
          查看实时决策流
        </Link>
        <Link href="/chat" className="btn ghost full" style={{ textAlign: "center" }}>
          用一句话指挥 Agent
        </Link>
      </div>
    </>
  );
}
