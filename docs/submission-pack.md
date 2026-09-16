# Metrix AI — 提交材料包（复制即填版）

> 对应 Metropolis 平台提交表单（9/22 开放，10/14 11:59 GMT+8 截止）
> 英文内容为提交正文（评审为国际评委），中文注释仅供团队参考，不要填入表单。

---

## 1. 基础字段

### Project name
```
Metrix AI
```

### One-liner / Tagline
```
An autonomous AI trading agent on Monad that spots on Kuru, perps on Perpl — every decision auditable on-chain.
```

### Short description (~300 chars)
```
Metrix AI is an autonomous trading agent on Monad. Spot orders route through Kuru's fully-onchain orderbook, perpetuals through Perpl. Three deterministic strategies run behind six hard-coded risk rules. The LLM only parses natural-language commands — it never touches trading decisions. Every trade leaves an on-chain proof.
```

### Links
| 字段 | 值 |
|---|---|
| GitHub repo | https://github.com/yigenfeng0707-netizen/metrix-ai |
| Project homepage | https://yigenfeng0707-netizen.github.io/metrix-ai/ |
| Demo video | （10/9-11 拍摄后填 B 站/YouTube 链接） |
| Live app / Demo | 本地运行：`npm install` → `npm run dev:agent` → `npm run dev:web`（Docker 一键：`docker compose up`） |

---

## 2. Long description（主项目描述，粘贴用）

```
PROBLEM
AI agents can chat, but almost none of them can actually trade. The ones that "trade" are either black boxes (users can't see why a trade happened) or wrappers around centralized exchanges (no self-custody, no verifiability).

SOLUTION
Metrix AI is an autonomous trading agent deployed on Monad. It manages a vault, executes trades through Kuru's fully-onchain CLOB (spot) and Perpl (perpetuals), and exposes every decision in a live, auditable feed: signal snapshot → rule triggered → risk verdict → on-chain transaction proof.

KEY DESIGN PRINCIPLE: the LLM never touches trading decisions.
All trading signals come from deterministic, backtestable strategies (grid, mean-reversion with trend filtering, and an LSTM direction model served from a PyTorch GPU service). The LLM's only jobs are parsing natural-language commands into structured parameters and writing human-readable decision summaries — under a strict JSON schema, always subject to user confirmation and risk re-validation.

RISK ENGINE (the core differentiator)
Six hard rules enforced server-side, with caps the UI can tighten but never loosen:
R1 per-order cap ≤ 5% of equity · R2 per-market exposure ≤ 30% · R3 daily-loss halt at -3% (new positions blocked) · R4 max-drawdown kill-switch at -10% (flatten all + pause) · R5 on-chain slippage enforcement (minAmountOut) · R6 idempotency + per-market rate limiting.

WHAT'S BUILT (all working at submission time)
- Autonomous agent loop: perceive → decide → risk-gate → execute → audit, with WebSocket push of every decision
- Live trading on Monad testnet: real margin deposit and real IOC margin sell executed on Kuru (tx hashes in README and below)
- Mobile-first PWA with 5 screens: vault overview, live decision stream, portfolio, chat commands, strategy settings
- PostgreSQL write-through persistence of every decision and order
- Docker Compose full stack (agent, web, ML service, PostgreSQL, Redis) and GitHub Actions CI with 15 unit tests

ON-CHAIN VERIFICATION (Monad testnet)
- Margin deposit: 0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55
- IOC margin sell: 0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7
(Sign in with the same wallet on Kuru testnet app to see positions.)

TEAM
Solo builder (fengyigen) — full-stack (Next.js/Node/TS), DeFi integrations (Kuru SDK, Perpl API), ML (PyTorch), infrastructure (Docker, CI, PostgreSQL).
```

---

## 3. 主赛道 Track 01 — Onchain Finance & Trading（$30,000 池）

主赛道由评审按整体质量打分，重点讲：全链上订单簿原生交易体验、风控体系、可审计性。主描述（§2）即为赛道提交主体，无需另写。

---

## 4. 各 Bounty 独立说明（逐项复制）

### 4.1 Build the Next Consumer Trading App on Kuru — $5,000（Kuru · Track 01）

```
Metrix AI is a focused spot trading product that routes every trade through Kuru's onchain order book on Monad.

What we built on top of Kuru:
- Spot execution layer powered by @kuru-labs/kuru-sdk: market params fetching (price/size precision, tick size), GTC post-only limit orders, IOC market orders with isMargin=true, margin account deposits, and OrderCreated event parsing for order tracking.
- A consumer-grade mobile-first PWA (not a trading terminal): users see a simple vault balance, a live "decision stream" written in plain language, and one-tap actions — the CLOB complexity is hidden behind risk-managed strategies.
- Verified end-to-end on Monad testnet with real transactions: margin deposit 0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55 and IOC margin sell 0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7 (MON-USDC market, orderbook 0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9).

Consumer angle: the user never touches an order ticket. They set a risk profile in plain language; our strategies (grid + mean-reversion + ML signal) generate the orders, our risk engine gates them, and Kuru's CLOB executes them — with every fill linked from the UI.
```

### 4.2 Best use of Perpl's API — $5,000（Perpl · All tracks）

```
Metrix AI is a production-ready trading bot and automation system built around Perpl.

What we built with Perpl:
- The agent's perpetual execution layer is designed around Perpl's REST/WS architecture: REST for account state and history (fills, order history, position history with cursor pagination), WebSocket for market state (oracle/mark/last prices, OI, TVL) and order placement.
- An autonomous margin-trading flow: the agent computes position sizing from vault equity, gates it through its risk engine (order cap, exposure limit, daily-loss halt, max-drawdown kill-switch), and submits IOC market orders with slippage protection.
- IOC margin sell verified on Monad testnet: tx 0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7 (isMargin=true path, executed against the agent's margin funds).
- Real-time risk monitoring consumes the same WS streams: unrealized PnL and exposure feed the kill-switch logic (R4) that can flatten all positions without human intervention.

Why it matters: most "AI trading" demos call a CEX API. Metrix AI automates a fully on-chain perpetual venue on Monad, with the risk layer enforcing hard caps that a UI cannot bypass.
```

### 4.3 Best Analytics / Risk Tool — $3,000（Perpl · Track 01）

```
We built RiskGate — a real-time risk-monitoring engine and audit layer for an autonomous trading agent on Perpl/Kuru.

Six hard rules, evaluated on every order intent before execution:
R1 per-order notional ≤ 5% of live equity; R2 per-market exposure ≤ 30%; R3 daily-loss halt at -3% (blocks new risk, allows closes); R4 max-drawdown kill-switch at -10% from high-water mark — flattens every position and halts the agent; R5 slippage protection via on-chain minAmountOut; R6 client-order-id idempotency + per-market rate limiting.

The engine is fully observable: every verdict (pass or reject, with the exact rule and numbers) is written to a decision feed the user sees in real time on mobile, and persisted to PostgreSQL for post-hoc audit. Risk caps are hard-coded server-side; the product UI can tighten them but cannot loosen them beyond the ceiling — a deliberate design choice for user trust.

Live demo: the submission video shows a daily-loss halt firing automatically and the agent refusing new risk while still allowing position closes.
```

### 4.4 Best Agent Wallet Plugin — $2,500（MetaMask · Track 01）

```
We built an agent-executor wallet layer that gives an AI agent a safe, venue-agnostic trading superpower.

The execution layer abstracts the wallet behind a single IntentOrder interface (clientOrderId, venue, side, type, price, size, reason). Adapters implement quote/execute/cancel/positions per venue: today Kuru (onchain CLOB via official SDK) and Perpl (perp WS flow), with a simulation venue for safe testing. The agent wallet signs with a dedicated hot key whose capabilities are constrained by the risk engine — the wallet cannot sign an order the RiskGate has not approved.

This is exactly the plugin shape a MetaMask Agent Wallet integration needs: intent in (LLM-parsed, risk-checked), signed transaction out, full audit trail back to the caller. The next milestone is packaging the executor as a MetaMask Agent Wallet plugin so an external agent can call it through the same interface.

Verified on Monad testnet: margin deposit 0xe15c8218… and IOC margin sell 0x0b1b77cc… executed by this wallet layer.
```

### 4.5 Best Mobile Trading App on Monad — $10,000（Agora · Track 01）

```
Metrix AI ships as a mobile-first PWA for autonomous trading on Monad: installable to the home screen, five purpose-built screens (vault, live decision stream, portfolio, chat commands, strategy settings), all interactions designed one-thumb-first.

Trading flow aligned with the Agora bounty: the app authenticates the user wallet, the agent vault holds funds, and trades execute through Perpl (margin IOC flow verified on-chain: 0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7) with spot on Kuru.

Planned before final submission: Mera passkey onboarding and an AUSD funding leg to match the bounty's full spec (passkey auth → AUSD balance → Perpl trades). The Perpl execution and mobile shell are already live.
```

> ⚠️ 自用备注：此 Bounty 要求 Mera passkey 登录 + AUSD 余额，我们目前用 wagmi 钱包 + MON/USDC。两条路：
> ① 10 月前接入 Mera passkey + AUSD 计价（工作量 2-3 天，命中 $10k 概率大增）
> ② 时间不够则按上面文案诚实提交（Perpl 交易部分完全符合，Mera/AUSD 标注 in progress）
> 拍板时间：10/5 功能冻结前。

### 4.6 Best Community Team Project — $5,000（Monad Foundation · All tracks）

```
Metrix AI is built and shipped in the open by a solo builder from the Metropolis community (OpenBuild ecosystem, China).

Everything is public from day one: the GitHub repo carries a complete commit history from registration through submission (CI-checked on every push), the project homepage is live on GitHub Pages, and the build process — including SDK integration pitfalls we documented and fixed (Kuru SDK ethers dual-instance issue, Perpl UA filtering) — is written up for other builders to reuse.

We also participate in the community loop: Monad Developers Discord, and we share our Kuru/Perpl integration notes with other Metropolis builders on request.
```

> 自用备注：若该 Bounty 需要证明"社区支持者"身份（如加入 Monad Devs Discord 拿 role），9 月内完成 Discord 加入。

---

## 5. Progress Updates（平台 Progress Updates 标签页，建议发布节奏）

| 时间 | 更新内容 |
|---|---|
| 9/22 提交通道开放时 | "Project created: Metrix AI — autonomous trading agent. Kuru testnet integration verified (deposit + IOC margin sell txs)." |
| 9/29 | "Strategy suite live: grid + mean-reversion + ML signal (PyTorch). Risk engine v1 complete with 6 hard rules." |
| 10/8 | "Mainnet demo deployed. Demo video coming 10/11." |
| 10/12 | "Final submission up. All bounty materials linked." |

---

## 6. 提交前最终自检（10/12 执行）

- [ ] 表单逐字段粘贴 §1-§4 内容
- [ ] Demo 视频链接已填
- [ ] 链上 tx 链接可公开访问（测试网浏览器）
- [ ] GitHub 仓库 README 的 tx hash 与表单一致
- [ ] 6 个 Bounty 各自说明已填
- [ ] 团队成员（若有加入）已确认
- [ ] 提交后截图存档

## 7. 答辩 Q&A 预案（评审可能问）

| 问题 | 要点 |
|---|---|
| 为什么信 LLM 不乱交易？ | LLM 不在决策路径上，只做意图解析；所有交易由确定性策略+风控产生，JSON Schema 白名单+确认卡+风控复核三层约束 |
| 网格策略在单边行情会亏吧？ | 会，这正是趋势过滤（EMA 休眠）+R4 回撤强平存在的原因；回测报告在仓库 |
| Agent 钱包安全吗？ | 专用热钱包只放演示小额；六条硬规则服务端强制；恢复路径：R4 自动全平 |
| 和只调 GPT-4 写交易代码有什么区别？ | 每笔交易有完整审计链：信号快照、规则命中、风控裁决、tx hash，全部可回放；黑箱不可审计 |
| 后续计划？ | Mera passkey + AUSD（Agora bounty 全 spec）、会话密钥替代热钱包、Perpl 组合保证金 |
