"use client";

import { useEffect, useState } from "react";
import type { AccountState } from "@metrix/shared";
import { getOverview, fmtUsd } from "@/lib/api";
import { useAgentStream } from "@/lib/useAgentStream";

export default function PortfolioPage() {
  const [account, setAccount] = useState<AccountState | null>(null);

  useEffect(() => {
    getOverview().then((d) => setAccount(d.account));
  }, []);

  useAgentStream(() => {
    getOverview().then((d) => setAccount(d.account));
  });

  if (!account) return <p className="muted">加载中…</p>;

  return (
    <>
      <h1>持仓明细</h1>
      <p className="subtitle">Agent 金库内的实时仓位与成本</p>

      {account.positions.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>暂无持仓。价格穿越网格下沿时 Agent 会自动建仓。</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>市场</th>
                <th>数量</th>
                <th>成本</th>
                <th>现价</th>
                <th>浮盈</th>
              </tr>
            </thead>
            <tbody>
              {account.positions.map((p) => {
                const upl = (p.markPrice - p.avgCost) * p.size;
                return (
                  <tr key={p.market}>
                    <td>{p.market}</td>
                    <td>{p.size.toFixed(4)}</td>
                    <td>{p.avgCost.toFixed(2)}</td>
                    <td>{p.markPrice.toFixed(2)}</td>
                    <td className={upl >= 0 ? "pos" : "neg"}>
                      {upl >= 0 ? "+" : ""}
                      {fmtUsd(upl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="card row">
        <span className="muted">持仓总市值</span>
        <span className="mono">
          {fmtUsd(account.positions.reduce((s, p) => s + p.size * p.markPrice, 0))}
        </span>
      </div>
      <div className="card row">
        <span className="muted">可用资金</span>
        <span className="mono">{fmtUsd(account.vaultUsdc)}</span>
      </div>
    </>
  );
}
