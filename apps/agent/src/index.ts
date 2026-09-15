import { buildServer } from "./api/server";
import { startAgentLoop } from "./core/agent-loop";
import { config } from "./config";
import { ensureTables } from "./db/pg";

async function main(): Promise<void> {
  const app = await buildServer();
  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`[agent] API: http://localhost:${config.port}  (mode=${config.mode})`);
  console.log(`[agent] WS : ws://localhost:${config.port}/ws`);

  const db = await ensureTables().catch(() => false);
  console.log(`[agent] db : ${db ? "PostgreSQL 已连接，决策/订单 write-through 持久化开启" : "未配置 DATABASE_URL 或连接失败，纯内存模式"}`);

  startAgentLoop();
}

main().catch((err) => {
  console.error("[agent] fatal:", err);
  process.exit(1);
});
