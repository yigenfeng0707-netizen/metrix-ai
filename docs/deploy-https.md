# 完整 App 的稳定 HTTPS 部署（尚未上线）

**9/22 评审体验链接用 GitHub Pages，不要等这条文档完成才填表。**

主页（已上线）：https://yigenfeng0707-netizen.github.io/metrix-ai/  
完整栈：Next.js (`apps/web`) + 常驻 Agent (`apps/agent`，REST + WebSocket + 可选下单循环)。Agent **不适合** Vercel Serverless。

## 本机实测（2026-09-21）

| 工具 | 状态 |
|---|---|
| GitHub Pages | 已开通，`main:/docs`，HTTPS 强制 |
| `vercel` CLI | 已安装，**token 无效**，需要你本机执行 `vercel login` |
| `railway` CLI | 已安装，**未登录**（`railway whoami` 失败） |
| Fly.io CLI | 未安装 |
| 仓库内 | 无 `vercel.json` / `railway.toml` / `fly.toml` |

因此这次没有把 Next+Agent 推到公网。禁止用 ngrok / cloudflared 当评审 URL。

## 最短路径（Railway 跑 Docker Compose）

1. 浏览器打开 https://railway.app 注册（GitHub 登录即可）。
2. 本机：`railway login`，然后在仓库根 `metrix-ai/`：`railway init` → `railway up`。
3. 用 Railway Variables 填（**不要 commit**）：
   - `AGENT_MODE=sim`（评审只看 UI 时保持 sim）
   - `NEXT_PUBLIC_AGENT_URL=https://<agent 服务公网域名>`
   - 若要 testnet：`KURU_RPC_URL` / `KURU_PRIVATE_KEY` 等，只放平台密钥库。
4. Web 与 Agent 分成两个服务时，Web 的 `NEXT_PUBLIC_AGENT_URL` 必须是 Agent 的 HTTPS 源，并给 Agent 开 CORS（已在 `apps/agent/src/api/server.ts`）。
5. 无痕窗口走一遍 Home → Trade → Chat。通过后把该 HTTPS 域名回填报名表（替换 Pages 仅当主路径可演示）。

## 不要做

- 不要把 `.env` 推进 GitHub。
- 不要把临时 tunnel 填进 Metropolis 表单。
- 不要在 Vercel 上跑 Agent 主循环（无长驻进程，WS 与下单循环会掉）。
