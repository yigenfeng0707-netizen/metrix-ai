# Metrix AI — Monad 自主交易 Agent

> Monad Metropolis 黑客松 · Track 01（链上金融与交易）
> 现货执行走 Kuru 全链上订单簿，永续走 Perpl，移动端优先，全程链上可验证。

[![CI](https://github.com/yigenfeng0707-netizen/metrix-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/yigenfeng0707-netizen/metrix-ai/actions/workflows/ci.yml)
[![App](https://img.shields.io/badge/app-ms.show-green)](https://gsym236998-metrix-ai.ms.show)
[![Homepage](https://img.shields.io/badge/intro-GitHub%20Pages-blue)](https://yigenfeng0707-netizen.github.io/metrix-ai/)

**评审体验链接（HTTPS App）：** https://gsym236998-metrix-ai.ms.show  
项目介绍页：https://yigenfeng0707-netizen.github.io/metrix-ai/  
创空间：https://www.modelscope.cn/studios/gsym236998/metrix-ai  

不要把 localhost 填进报名表。部署与保活见 `docs/deploy-https.md`。

链上验证（Monad 测试网，**Kuru**）：
- 充值 https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55
- IOC 卖出 https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7

## 快速开始（Sim 模式，无需任何链上配置）

```bash
npm install

# 终端 1：启动 Agent 后端（默认 sim 模式：内置模拟行情 + 模拟成交）
npm run dev:agent        # http://localhost:8787

# 终端 2：启动前端
npm run dev:web          # http://localhost:3000
```

打开 http://localhost:3000 即可看到：金库总览 → 实时决策流 → 持仓 → 自然语言指令 → 策略设置。

## Docker 全栈一键部署（含 ML 信号服务）

```bash
docker compose up -d --build
# web   → http://localhost:3000
# agent → http://localhost:8787
# ml    → http://localhost:8900  (PyTorch，自动检测 CUDA；宿主机需 NVIDIA GPU + nvidia-container-toolkit)
```

包含 5 个服务：`postgres`（W2 持久化）、`redis`（行情缓存）、`ml`（GPU 信号服务）、`agent`、`web`。
默认 sim 模式，无任何链上配置即可跑通全栈。

## ML 信号策略（PyTorch）

LSTM 方向分类器（特征：对数收益率/振幅/动量，序列长度 120）：

```bash
# 本地训练（合成数据，离线可跑；GPU 版请用上方 Docker 镜像或安装 CUDA 版 torch）
cd ml && python train.py --steps 1500          # 加 --real --market 1 用 Perpl 真实 K 线

# 推理服务
python -m uvicorn serve:app --port 8900
#   GET  /health → { device, trained }
#   POST /predict { prices: [...] } → { p_up, side }

# Agent 启用（.env）：ML_ENABLED=true ML_URL=http://localhost:8900
```

Agent 主循环中作为第三个策略（`ml-signal`）：`p_up ≥ 0.6 → 买`，`≤ 0.4 → 卖`；
服务不可达时**静默降级跳过**，绝不阻塞主循环。训练/推理自动使用 CUDA（若可用）。


## 目录结构

```
metrix-ai/
├── apps/
│   ├── agent/        # Agent 后端：主循环 / 策略引擎 / 风控引擎 / 执行路由 / REST+WS
│   └── web/          # Next.js 前端：5 屏 mobile-first PWA
└── packages/
    └── shared/       # 共享类型（IntentOrder / DecisionEvent / AccountState ...）
```

## Agent 后端模块地图

| 模块 | 文件 | 说明 |
|---|---|---|
| 主循环 | `apps/agent/src/core/agent-loop.ts` | 感知 → 决策 → 风控 → 执行 → 审计 |
| 信号中枢 | `src/strategy/signal-hub.ts` | 价格历史 + 多策略组合（现货：网格 + 均值回归） |
| 网格策略 | `src/strategy/grid.ts` | 格位穿越触发（确定性规则，LLM 不进决策路径） |
| 均值回归 | `src/strategy/mean-reversion.ts` | VWAP±kσ 反向入场 + EMA 趋势过滤休眠 |
| Perp 趋势 | `src/strategy/perp-trend.ts` | P1 永续动量跟随（状态机防重复开仓） |
| 风控引擎 | `src/risk/risk-gate.ts` | R1–R6 六条硬规则（限额/熔断/回撤强平/滑点/幂等） |
| 执行路由 | `src/execution/router.ts` | venue 无关分发：sim / kuru / perpl |
| Kuru 适配器 | `src/execution/kuru-adapter.ts` | 官方 SDK（ethers v5）：GTC/IOC 下单、保证金充值 |
| Perpl 适配器 | `src/execution/perpl-adapter.ts` | 交易 WS（mt:29 认证 / mt:22 下单，Ed25519） |
| Perpl REST | `src/market/perpl-rest.ts` | 公开行情（context/K线）+ 认证历史查询脚手架 |
| 意图解析 | `src/llm/intent-parser.ts` | 离线兜底解析；W2/W3 替换为 LLM 结构化输出 |
| API + WS | `src/api/server.ts` | Fastify REST + WebSocket 实时推送 |

> Perpl 协议参考（已核对官方文档）：REST 仅行情/历史；下单走 `wss://.../ws/v1/trading`，
> 认证帧 `mt:29`，下单帧 `mt:22`（rq 严格递增），成交以 `mt:24` 为准。
> Kuru SDK 基于 **ethers v5**（适配器已对齐）。

## 切换 Live 模式（W1 验证后）

1. 复制 `apps/agent/.env.example` 为 `.env`，填入 Monad RPC / 私钥 / Kuru 市场合约地址
2. `AGENT_MODE=live` 后重启；`kuru-adapter.ts` 中标注了 3 个 W1 需对照官方文档校准的点
3. 强烈建议先在 Monad 测试网 + 小额资金验证

## 与参赛方案的对应

- 完整方案见仓库外层 `完整方案-MetrixAI-AI交易Agent.md`
- 持久化（W2 已完成）：决策/订单 **write-through 写入 PostgreSQL**（`src/db/pg.ts`，
  node-postgres 纯 JS 实现，`DATABASE_URL` 未配置时自动降级纯内存模式）；
  表结构文档见 `apps/agent/prisma/schema.prisma`（Prisma 迁移作为后续演进项）
- 提交要求：公开仓库 commit 覆盖黑客松窗口（评审需验证 6 周内新开发）
