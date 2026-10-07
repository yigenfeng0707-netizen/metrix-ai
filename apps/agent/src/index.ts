import { buildServer } from "./api/server";
import { startAgentLoop } from "./core/agent-loop";
import { config } from "./config";
import { ensureTables } from "./db/pg";
import { initFileStore, loadSnapshot } from "./db/file-store";
import { store } from "./store";

async function main(): Promise<void> {
  const app = await buildServer();
  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`[agent] API: http://localhost:${config.port}  (mode=${config.mode})`);
  console.log(`[agent] WS : ws://localhost:${config.port}/ws`);

  const db = await ensureTables().catch(() => false);
  if (db) {
    console.log("[agent] db : PostgreSQL 已连接，决策/订单 write-through 持久化开启");
  } else {
    const fileOk = initFileStore();
    if (fileOk) {
      const snap = loadSnapshot();
      if (snap) {
        store.hydrateFromFile(snap.account, snap.decisions);
        console.log(
          `[agent] db : 文件持久化已恢复 ${snap.decisions.length} 条决策（PostgreSQL 未启用）`,
        );
      } else {
        console.log("[agent] db : 文件持久化已启用（冷启动空库；决策将写入本地 JSON）");
      }
    } else {
      console.log("[agent] db : 无持久化后端，纯内存模式");
    }
  }

  startAgentLoop();
}

main().catch((err) => {
  console.error("[agent] fatal:", err);
  process.exit(1);
});
