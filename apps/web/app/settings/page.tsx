"use client";

import { useEffect, useState } from "react";
import type { GridParams, MRParams, RiskLimits } from "@metrix/shared";
import { getOverview, updateMr, updateStrategy } from "@/lib/api";
import {
  meraCreateAccount,
  meraLogin,
  meraErrorHint,
  hasMeraCredential,
  loadMeraAddress,
  saveMeraAddress,
  getAusdBalance,
  getMonBalance,
  sendMonTransfer,
  sendAusdTransfer,
} from "@/lib/mera";

/** Agent 金库地址（资金目标，环境变量注入） */
const AGENT_WALLET = process.env.NEXT_PUBLIC_AGENT_WALLET ?? "0x56deA58769d57851D2372A4987C7EBD3a5F5C1E6";
const EXPLORER_TX = "https://monadexplorer.com/tx/";

export default function SettingsPage() {
  const [grid, setGrid] = useState<GridParams | null>(null);
  const [mr, setMr] = useState<MRParams | null>(null);
  const [perp, setPerp] = useState<{ enabled: boolean; side: string } | null>(null);
  const [risk, setRisk] = useState<RiskLimits | null>(null);
  const [saved, setSaved] = useState(false);
  const [meraAddress, setMeraAddress] = useState<string | null>(null);
  const [meraHasCred, setMeraHasCred] = useState(false);
  const [ausd, setAusd] = useState<string>("");
  const [mon, setMon] = useState<string>("");
  const [meraBusy, setMeraBusy] = useState(false);
  const [meraMsg, setMeraMsg] = useState("");
  // 资金流（D3）：派生私钥仅存内存（刷新即失效，安全），转账金额与结果
  const [fundAmount, setFundAmount] = useState("1");
  const [fundTarget, setFundTarget] = useState<"mon" | "ausd">("mon");
  const [fundBusy, setFundBusy] = useState(false);
  const [fundMsg, setFundMsg] = useState("");
  const [privKey, setPrivKey] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    getOverview().then((d) => {
      setGrid(d.strategy);
      setMr(d.mr);
      setPerp(d.perp);
      setRisk(d.riskLimits ?? null);
    });
    setMeraAddress(loadMeraAddress());
    setMeraHasCred(hasMeraCredential());
  }, []);

  /** 派生成功后统一处理：持久化地址 + 查主网余额（MON/AUSD） */
  async function afterDerived(addr: string, pk: `0x${string}`) {
    setMeraAddress(addr);
    saveMeraAddress(addr);
    setMeraHasCred(true);
    setPrivKey(pk);
    setMeraMsg("✅ passkey 账户已派生，正在查询主网余额…");
    try {
      const [m, a] = await Promise.all([
        getMonBalance(addr).catch(() => null),
        getAusdBalance(addr).catch(() => null),
      ]);
      setMon(m === null ? "N/A（主网 RPC 不可达）" : `${m.toFixed(4)} MON`);
      setAusd(a === null ? "N/A" : a > 0 ? `${a} AUSD` : "0 AUSD");
    } catch {
      setMon("N/A");
      setAusd("N/A");
    }
  }

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

      <h2>Mera Passkey（Agora $10k Bounty）</h2>
      <div className="card">
        <div className="row">
          <div>
            <div className="stat-label">passkey 认证</div>
            <div className="small muted">
              {meraAddress
                ? `已派生账户：${meraAddress.slice(0, 10)}…${meraAddress.slice(-6)}`
                : meraHasCred
                  ? "本机已有 passkey，点击登录重新派生同一账户"
                  : "尚未创建。点击后由浏览器/系统弹出 passkey 创建流程"}
            </div>
          </div>
          <button
            className="btn"
            disabled={meraBusy}
            onClick={async () => {
              setMeraBusy(true);
              setMeraMsg("");
              try {
                // 已有 credential 时走登录（重新派生同一账户），否则创建新 passkey
                const r = hasMeraCredential()
                  ? await meraLogin()
                  : await meraCreateAccount("metrix-" + Math.random().toString(36).slice(2, 8));
                await afterDerived(r.address, r.privateKey);
              } catch (e) {
                setMeraMsg("⚠ " + (e instanceof Error ? meraErrorHint(e) : String(e)));
              } finally {
                setMeraBusy(false);
              }
            }}
          >
            {meraBusy ? "处理中…" : meraHasCred ? (meraAddress ? "重新验证 Passkey" : "登录 Passkey") : "创建 Mera Passkey"}
          </button>
        </div>
        {meraMsg && <p className="small muted" style={{ margin: "8px 0 0" }}>{meraMsg}</p>}
        {meraAddress && (
          <p className="mono" style={{ margin: "8px 0 0", wordBreak: "break-all" }}>{meraAddress}</p>
        )}
        {meraAddress && (mon || ausd) && (
          <div className="row" style={{ marginTop: 8 }}>
            <span className="small muted">主网余额</span>
            <span className="small"><b>{mon || "…"}</b> · <b>{ausd || "…"}</b></span>
          </div>
        )}
      </div>

      {meraAddress && privKey && (
        <>
          <h2>资金流（Mera 账户 → Agent 金库）</h2>
          <div className="card">
            <div className="row">
              <div>
                <div className="stat-label">第一步：先给你的 passkey 账户充值（从钱包/交易所转 MON 到）</div>
                <div className="mono small" style={{ wordBreak: "break-all" }}>{meraAddress}</div>
              </div>
              <button className="btn ghost" onClick={() => navigator.clipboard.writeText(meraAddress)}>
                复制
              </button>
            </div>
            <div className="card" style={{ marginTop: 10 }}>
              <div className="stat-label">第二步：向 Agent 金库转账</div>
              <div className="mono small" style={{ wordBreak: "break-all", margin: "4px 0 8px" }}>{AGENT_WALLET}</div>
              <div className="row" style={{ margin: "0 0 8px" }}>
                {(["mon", "ausd"] as const).map((t) => (
                  <button
                    key={t}
                    className={`btn ${fundTarget === t ? "" : "ghost"}`}
                    onClick={() => setFundTarget(t)}
                    style={{ flex: 1 }}
                  >
                    {t === "mon" ? "MON（原生）" : "AUSD（稳定币）"}
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
              />
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button
                className="btn full"
                disabled={fundBusy || Number(fundAmount) <= 0}
                onClick={async () => {
                  setFundBusy(true);
                  setFundMsg("");
                  try {
                    // 预检余额（QuickNode 会对余额不足直接拒绝且报错难懂）
                    const amt = Number(fundAmount);
                    if (fundTarget === "mon") {
                      const bal = await getMonBalance(meraAddress).catch(() => -1);
                      if (bal < amt + 0.01) {
                        setFundMsg(`⚠ 余额不足：当前 ${bal < 0 ? "?" : bal} MON，转账需要 ${amt} MON + gas。请先给你的 passkey 账户充值。`);
                        return;
                      }
                    } else {
                      const bal = await getAusdBalance(meraAddress).catch(() => -1);
                      if (bal < amt) {
                        setFundMsg(`⚠ 余额不足：当前 ${bal < 0 ? "?" : bal} AUSD，需要 ${amt} AUSD。`);
                        return;
                      }
                    }
                    const hash =
                      fundTarget === "ausd"
                        ? await sendAusdTransfer(privKey, AGENT_WALLET, amt)
                        : await sendMonTransfer(privKey, AGENT_WALLET, amt);
                    setFundMsg(`✅ 已广播：${hash.slice(0, 14)}…${hash.slice(-8)}（等待 finalized 确认）`);
                    window.open(EXPLORER_TX + hash, "_blank");
                  } catch (e) {
                    setFundMsg("⚠ " + (e instanceof Error ? e.message : String(e)));
                  } finally {
                    setFundBusy(false);
                  }
                }}
              >
                {fundBusy ? "签名中…" : "转入 Agent 金库"}
              </button>
            </div>
            {fundMsg && <p className="small muted" style={{ margin: "8px 0 0" }}>{fundMsg}</p>}
            <p className="muted small" style={{ margin: "8px 0 0" }}>
              由 passkey 派生密钥本地签名（私钥不出内存）；Monad 按声明 gasLimit 收费，转账使用显式 gas。
            </p>
          </div>
        </>
      )}
      <p className="muted small">
        该账户由你的 passkey 派生（无需助记词），用于 AUSD/MON 余额展示与向 Agent 金库充值（D3 资金流）。
      </p>

      <h2>Perpl 永续模块（P1）</h2>
      <div className="card row">
        <div>
          <div className="stat-label">状态</div>
          <div className="small muted">
            {perp?.enabled
              ? `已启用 · 当前仓位：${perp.side === "flat" ? "空仓" : perp.side === "long" ? "多" : "空"}`
              : "未启用（PERPL_ENABLED=false）。适配器已写，尚无 Perpl 成交哈希。"}
          </div>
        </div>
        <span className={`badge ${perp?.enabled ? "ok" : "rej"}`}>{perp?.enabled ? "ON" : "OFF"}</span>
      </div>
      <p className="muted small">
        启用需在本机 .env 配置 Perpl 测试网密钥。Settings 里的 Kuru 测试网 hash 不是 Perpl 成交。
      </p>

      <h2>风控硬规则（只读；Chat 只能调严）</h2>
      <div className="card">
        <table>
          <tbody>
            <tr><td>R1 单笔限额</td><td>≤ 净值 {((risk?.maxOrderPct ?? 0.05) * 100).toFixed(0)}%</td></tr>
            <tr><td>R2 单市场敞口</td><td>≤ 净值 {((risk?.maxExposurePct ?? 0.3) * 100).toFixed(0)}%</td></tr>
            <tr><td>R3 日亏损熔断</td><td>{((risk?.dailyLossHaltPct ?? -0.03) * 100).toFixed(0)}% 停止开新仓</td></tr>
            <tr><td>R4 最大回撤强平</td><td>{((risk?.maxDrawdownPct ?? -0.1) * 100).toFixed(0)}% 全平 + 暂停</td></tr>
            <tr><td>R5 滑点保护</td><td>链上 minAmountOut 强制（{risk?.maxSlippageBps ?? 50} bps）</td></tr>
            <tr><td>R6 频率/幂等</td><td>{risk?.minSecondsBetweenOrders ?? 5}s 限 1 单</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
