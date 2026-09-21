# 完整 App 的稳定 HTTPS 部署（魔搭创空间 Docker）

**评审体验链接（可点的 App）：** https://gsym236998-metrix-ai.ms.show  
创空间页：https://www.modelscope.cn/studios/gsym236998/metrix-ai  
项目介绍页（GitHub Pages）：https://yigenfeng0707-netizen.github.io/metrix-ai/

核验（2026-09-21，浏览器 UA）：

| 路径 | 结果 |
|---|---|
| `/` | HTTP 200，Next.js 五屏壳 |
| `/healthz` | HTTP 200，`ok:true` `mode:sim`，`version` = 部署 SHA |
| `/vaults/demo/overview` | HTTP 200，Agent 金库 JSON |
| `/trade` `/chat` `/settings` | HTTP 200 |

创空间 OpenAPI `status=Running`，`sdk_type=docker`，`visibility=public`，`hardware=platform/2v-cpu-8g-mem`。无痕窗口可开主路径。不要填 localhost / ngrok / cloudflared。

## 架构（为什么是 Docker 而不是静态 Pages）

Next.js（对外 `0.0.0.0:7860`）+ 常驻 Fastify Agent（容器内 `127.0.0.1:8787`）+ `studio-proxy.mjs` 同源转发 `/vaults` `/ws` `/healthz`。Agent 主循环不能塞进 GitHub Pages。

GitHub **push 不等于** 创空间自动更新。`.github/workflows/deploy-modelscope.yml` 会把 GitHub 树同步进创空间自有 Git（`master`，禁止 force push），再 `POST /studios/{owner}/{name}/deploy`，轮询到 Running。

保活：`.github/workflows/modelscope-keepalive.yml`，公开仓 `cron: '*/5'`，带 Chrome UA ping `/healthz`（默认 curl UA 会被网关 403）。

## 本机不要做的事

- 不要再走 `vercel login` / `railway login` 当评审主机。
- 不要把 `.env`、私钥、真实密码推进 GitHub 或创空间 Git。
- 不要改 git config、不要 force push。

## 开发者本地复现（不是评审 URL）

```bash
npm install
npm run dev:agent    # 本机 Agent
npm run dev:web      # 本机 Next
```

或 `docker compose up -d --build`。
