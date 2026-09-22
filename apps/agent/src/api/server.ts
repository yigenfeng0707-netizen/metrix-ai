import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import type { GridParams, MRParams } from "@metrix/shared";
import { store, type StoredCommand } from "../store";
import { llmConfigured } from "../llm/modelscope";
import { parseCommand } from "../llm/parse-command";
import { applyParsedCommand } from "../llm/apply-command";
import { config } from "../config";
import { perpSide } from "../strategy/perp-trend";
import { dbStats } from "../db/pg";
import { snapshotRiskLimits } from "../risk/risk-limits";

type WsConn = { send: (data: string) => void; on: (ev: string, cb: () => void) => void };

export async function buildServer() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true }); // 允许前端跨域访问（开发环境全放开）
  await app.register(websocket);

  // ---------- WebSocket 实时推送 ----------
  app.get("/ws", { websocket: true }, (conn: WsConn) => {
    const onDecision = (d: unknown) => conn.send(JSON.stringify({ type: "decision", payload: d }));
    const onAccount = (a: unknown) => conn.send(JSON.stringify({ type: "account", payload: a }));
    store.on("decision", onDecision);
    store.on("account", onAccount);
    conn.on("close", () => {
      store.off("decision", onDecision);
      store.off("account", onAccount);
    });
  });

  app.get("/healthz", async () => ({
    ok: true,
    mode: config.mode,
    version: process.env.METRIX_DEPLOY_VERSION ?? process.env.GITHUB_SHA ?? "dev",
  }));

  // ---------- REST ----------
  app.get("/vaults/demo/overview", async () => ({
    vault: { id: "demo", name: "Metrix Demo Vault", agent: "Metrix Agent v0.1" },
    account: store.account,
    equity: store.equity(),
    strategy: store.params.grid,
    mr: store.params.mr,
    perp: { enabled: config.perpl.enabled, side: perpSide() },
    stats: { totalDecisions: store.decisions.length },
    db: await dbStats().catch(() => null),
    mode: config.mode,
    riskLimits: snapshotRiskLimits(),
    llm: {
      production: llmConfigured(),
      parser: llmConfigured() ? "modelscope" : "offline-regex",
      model: llmConfigured() ? config.llmModel : null,
    },
  }));

  app.get("/vaults/demo/decisions", async (req) => {
    const q = (req.query ?? {}) as { limit?: string };
    const limit = Math.min(Number(q.limit ?? 50), 500);
    return store.decisions.slice(0, limit);
  });

  // 自然语言指令：解析（不执行）→ 返回确认卡数据
  app.post("/vaults/demo/command", async (req, reply) => {
    const { text } = (req.body ?? {}) as { text?: string };
    if (!text?.trim()) return reply.code(400).send({ error: "text is required" });
    const { parsed, parser, model } = await parseCommand(text);
    const cmd: StoredCommand = {
      id: randomUUID(),
      text,
      parsed,
      status: "pending",
      ts: Date.now(),
    };
    store.commands.set(cmd.id, cmd);
    return reply.code(201).send({ id: cmd.id, parsed: cmd.parsed, parser, model });
  });

  // 用户批准后应用指令（set_risk 只能调严；失败不得假装已执行）
  app.post("/vaults/demo/command/:id/confirm", async (req, reply) => {
    const cmd = store.commands.get((req.params as { id: string }).id);
    if (!cmd) return reply.code(404).send({ error: "command not found" });
    if (cmd.status !== "pending") {
      return { id: cmd.id, status: cmd.status, applied: cmd.parsed, result: cmd.result };
    }

    const result = applyParsedCommand(cmd.parsed);
    cmd.result = result;
    cmd.status = result.status === "rejected" ? "rejected" : "applied";
    return { id: cmd.id, status: cmd.status, applied: cmd.parsed, result };
  });

  // 更新网格参数
  app.put("/vaults/demo/strategy", async (req, reply) => {
    const body = (req.body ?? {}) as Partial<GridParams>;
    if (typeof body.enabled === "boolean") store.params.grid.enabled = body.enabled;
    if (typeof body.lower === "number") store.params.grid.lower = body.lower;
    if (typeof body.upper === "number") store.params.grid.upper = body.upper;
    if (typeof body.grids === "number") store.params.grid.grids = Math.max(2, Math.round(body.grids));
    if (typeof body.orderSize === "number") store.params.grid.orderSize = Math.max(0, body.orderSize);
    if (store.params.grid.upper <= store.params.grid.lower) {
      return reply.code(400).send({ error: "upper must be > lower" });
    }
    return store.params.grid;
  });

  // 更新均值回归参数
  app.put("/vaults/demo/mr", async (req) => {
    const body = (req.body ?? {}) as Partial<MRParams>;
    const mr = store.params.mr;
    if (typeof body.enabled === "boolean") mr.enabled = body.enabled;
    if (typeof body.lookback === "number") mr.lookback = Math.min(200, Math.max(30, Math.round(body.lookback)));
    if (typeof body.zEntry === "number") mr.zEntry = Math.min(4, Math.max(0.5, body.zEntry));
    if (typeof body.orderSize === "number") mr.orderSize = Math.max(0, body.orderSize);
    if (typeof body.cooldownMs === "number") mr.cooldownMs = Math.max(0, body.cooldownMs);
    return mr;
  });

  return app;
}
