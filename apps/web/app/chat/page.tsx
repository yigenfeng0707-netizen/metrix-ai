"use client";

import { useEffect, useState } from "react";
import { confirmCommand, getOverview, postCommand, type Overview } from "@/lib/api";

interface Pending {
  id: string;
  action: string;
  note: string;
  requiresConfirmation: boolean;
}

const EXAMPLES = ["回撤超过 5% 就全平", "把网格区间改成 2900 到 3150，10 格", "全部平仓"];

export default function ChatPage() {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [llm, setLlm] = useState<Overview["llm"]>();

  useEffect(() => {
    getOverview()
      .then((o) => setLlm(o.llm))
      .catch(() => setLlm(undefined));
  }, []);

  async function submit(t: string) {
    if (!t.trim() || busy) return;
    setBusy(true);
    try {
      const r = await postCommand(t);
      if (r.parsed.requiresConfirmation) {
        setPending({
          id: r.id,
          action: r.parsed.action,
          note: r.parsed.note,
          requiresConfirmation: true,
        });
      }
      setLog((l) => [`🧑 ${t}`, `🤖 ${r.parsed.note}`, ...l]);
      setText("");
    } catch (e) {
      setLog((l) => [`⚠ ${e instanceof Error ? e.message : String(e)}`, ...l]);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      const r = await confirmCommand(pending.id);
      const result = r.result;
      const note = result?.note ?? r.applied?.note ?? pending.note;
      if (result?.status === "rejected" || r.status === "rejected") {
        setLog((l) => [`🤖 ⚠ 暂未生效：${note}`, ...l]);
      } else if (result?.status === "partial") {
        const skipped = result.skipped.map((s) => s.reason).join("；");
        setLog((l) => [`🤖 ⚠ 部分生效：${note}${skipped ? `（${skipped}）` : ""}`, ...l]);
      } else {
        setLog((l) => [`🤖 ✅ 已执行：${note}`, ...l]);
      }
      setPending(null);
    } catch (e) {
      setLog((l) => [`⚠ ${e instanceof Error ? e.message : String(e)}`, ...l]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>指令 Agent</h1>
      <p className="subtitle">
        {llm?.production
          ? `指令交给魔搭 ${llm.model ?? "Qwen"} 解析成结构化参数。模型不能下单：写操作必须批准，风控只能调严。`
          : "尚未配置魔搭 Token，指令暂用本地规则解析。写操作必须批准；风控只能调严。"}
      </p>

      <div className="card">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder='试试："回撤超过 5% 就全平"'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(text)}
          />
          <button className="btn" onClick={() => submit(text)} disabled={busy}>
            发送
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {EXAMPLES.map((e) => (
            <button key={e} className="btn ghost" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => submit(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {pending && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <div className="row">
            <span className="badge info">待确认 · {pending.action}</span>
          </div>
          <p style={{ margin: "8px 0" }}>{pending.note}</p>
          {pending.action === "set_risk" && (
            <p className="muted small">批准后只会收紧限额。若请求比当前更松，界面会标明「暂未生效」，不会假确认。</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={confirm} disabled={busy}>批准执行</button>
            <button className="btn ghost" onClick={() => setPending(null)}>取消</button>
          </div>
        </div>
      )}

      <h2>会话记录</h2>
      {log.length === 0 && <p className="muted small">Agent 会在这里回复解析与执行结果。</p>}
      {log.map((l, i) => (
        <div key={i} className="card" style={{ padding: 12 }}>
          <span className="small">{l}</span>
        </div>
      ))}
    </>
  );
}
