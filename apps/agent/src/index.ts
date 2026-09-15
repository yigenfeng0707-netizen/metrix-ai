import { buildServer } from "./api/server";
import { startAgentLoop } from "./core/agent-loop";
import { config } from "./config";

async function main(): Promise<void> {
  const app = await buildServer();
  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`[agent] API: http://localhost:${config.port}  (mode=${config.mode})`);
  console.log(`[agent] WS : ws://localhost:${config.port}/ws`);
  startAgentLoop();
}

main().catch((err) => {
  console.error("[agent] fatal:", err);
  process.exit(1);
});
