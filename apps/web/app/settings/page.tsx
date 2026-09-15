"use client";

import { useEffect, useState } from "react";
import type { GridParams, MRParams } from "@metrix/shared";
import { getOverview, updateMr, updateStrategy } from "@/lib/api";

export default function SettingsPage() {
  const [grid, setGrid] = useState<GridParams | null>(null);
  const [mr, setMr] = useState<MRParams | null>(null);
  const [perp, setPerp] = useState<{ enabled: boolean; side: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getOverview().then((d) => {
      setGrid(d.strategy);
      setMr(d.mr);
      setPerp(d.perp);
    });
  }, []);

  async function save() {
    if (!grid || !mr) return;
    setSaved(false);
    const [g, m] = await Promise.all([updateStrategy(grid), updateMr(mr)]);
    setGrid(g);
    setMr(m);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!grid || !mr) return <p className="muted">加载中…</p>;

  const numField = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    step = 1,
  ) => (
    <div className="card">
      <div className="stat-label">{label}</div>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ marginTop: 6 }}
      />
    </div>
  );

  const toggleRow = (title: string, desc: string, on: boolean, onToggle: () => void) => (
    <div className="card row">
      <div>
        <div className="stat-label">{title}</div>
        <div className="small muted">{desc}</div>
      </div>
      <button className={`btn ${on ? "ghost" : ""}`} onClick={onToggle}>
        {on ? "运行中 · 点击暂停" : "已暂停 · 点击启动"}
      </button>
    </div>
  );

  return (
    <>
      <h1>策略与风控</h1>
      <p className="subtitle">双策略组合（确定性规则）+ 永续模块状态</p>

      {toggleRow("网格策略（Grid）", "价格下穿买入 / 上穿卖出", grid.enabled, () =>
        setGrid({ ...grid, enabled: !grid.enabled }),
      )}
      {numField("区间下限 (USDC)", grid.lower, (v) => setGrid({ ...grid, lower: v }), 10)}
      {numField("区间上限 (USDC)", grid.upper, (v) => setGrid({ ...grid, upper: v }), 10)}
      {numField("网格数", grid.grids, (v) => setGrid({ ...grid, grids: v }))}
      {numField("单格投入 (标的数量)", grid.orderSize, (v) => setGrid({ ...grid, orderSize: v }), 0.005)}

      {toggleRow("均值回归（Mean Reversion）", "偏离 VWAP 超阈值反向入场；强趋势时自动休眠", mr.enabled, () =>
        setMr({ ...mr, enabled: !mr.enabled }),
      )}
      {numField("回看窗口 (tick)", mr.lookback, (v) => setMr({ ...mr, lookback: v }))}
      {numField("入场 z-score 阈值 (σ)", mr.zEntry, (v) => setMr({ ...mr, zEntry: v }), 0.1)}
      {numField("单笔投入 (标的数量)", mr.orderSize, (v) => setMr({ ...mr, orderSize: v }), 0.005)}

      <button className="btn full" onClick={save}>
        {saved ? "✅ 已保存" : "保存策略参数"}
      </button>

      <h2>Perpl 永续模块（P1）</h2>
      <div className="card row">
        <div>
          <div className="stat-label">状态</div>
          <div className="small muted">
            {perp?.enabled
              ? `已启用 · 当前仓位：${perp.side === "flat" ? "空仓" : perp.side === "long" ? "多" : "空"}`
              : "未启用（PERPL_ENABLED=false）"}
          </div>
        </div>
        <span className={`badge ${perp?.enabled ? "ok" : "rej"}`}>{perp?.enabled ? "ON" : "OFF"}</span>
      </div>
      <p className="muted small">
        启用需在 .env 配置 PERPL_API_KEY / PERPL_ACCOUNT_ID（API Key 注册 + 链上开户）。
      </p>

      <h2>风控硬规则（只读）</h2>
      <div className="card">
        <table>
          <tbody>
            <tr><td>R1 单笔限额</td><td>≤ 净值 5%</td></tr>
            <tr><td>R2 单市场敞口</td><td>≤ 净值 30%</td></tr>
            <tr><td>R3 日亏损熔断</td><td>-3% 停止开新仓</td></tr>
            <tr><td>R4 最大回撤强平</td><td>-10% 全平 + 暂停</td></tr>
            <tr><td>R5 滑点保护</td><td>链上 minAmountOut 强制</td></tr>
            <tr><td>R6 频率/幂等</td><td>5s 限 1 单</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
