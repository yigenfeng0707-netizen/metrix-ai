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
Metrix AI is an autonomous trading agent on Monad. Spot routes through Kuru's onchain CLOB; a Perpl adapter exists but is not live-verified. Deterministic strategies sit behind six risk rules. Chat commands go to ModelScope Qwen when a token is configured; otherwise the UI says local rules were used. Verified Kuru testnet txs are linked from the homepage.
```

### Links
| 字段 | 值 |
|---|---|
| GitHub repo | https://github.com/yigenfeng0707-netizen/metrix-ai |
| Project homepage | https://yigenfeng0707-netizen.github.io/metrix-ai/ |
| Demo video | （10/9-11 拍摄后填 B 站/YouTube 链接） |
| Live app / Demo | https://gsym236998-metrix-ai.ms.show |

---

## 2. Long description（主项目描述，粘贴用）

```
PROBLEM
AI agents can chat, but almost none of them can actually trade. The ones that "trade" are either black boxes (users can't see why a trade happened) or wrappers around centralized exchanges (no self-custody, no verifiability).

SOLUTION
Metrix AI is an autonomous trading agent deployed on Monad. It manages a vault, executes trades through Kuru's fully-onchain CLOB (spot) and Perpl (perpetuals), and exposes every decision in a live, auditable feed: signal snapshot → rule triggered → risk verdict → on-chain transaction proof.

KEY DESIGN PRINCIPLE: the model never touches trading decisions.
All trading signals come from deterministic, backtestable strategies (grid, mean-reversion with trend filtering, and an optional LSTM direction model). Natural-language commands are parsed into structured parameters (currently an offline regex fallback; LLM structured-output is a later swap) and always require a user confirmation card plus a second RiskGate pass.

RISK ENGINE (the core differentiator)
Six hard rules enforced server-side, with caps the UI can tighten but never loosen:
R1 per-order cap ≤ 5% of equity · R2 per-market exposure ≤ 30% · R3 daily-loss halt at -3% (new positions blocked) · R4 max-drawdown kill-switch at -10% (flatten all + pause) · R5 Kuru IOC minAmountOut from CostEstimator × (1 − 50 bps) · R6 idempotency + per-market rate limiting.

WHAT'S BUILT (all working at submission time)
- Autonomous agent loop: perceive → decide → risk-gate → execute → audit, with WebSocket push of every decision
- Live trading on Monad testnet: real margin deposit and real IOC margin sell executed on Kuru (tx hashes in README and below)
- Mobile-first 5 screens (Next.js; PWA manifest not shipped yet)
- PostgreSQL write-through persistence of every decision and order
- Docker Compose full stack (agent, web, ML service, PostgreSQL, Redis) and GitHub Actions CI with unit tests (risk + strategies + R5 floor)

ON-CHAIN VERIFICATION (Monad testnet, Kuru — not Perpl)
- Margin deposit: https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55
- IOC margin sell: https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7
(These are Kuru margin-account / orderbook txs. Perpl fills are not verified on-chain yet.)

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
- A consumer-grade mobile-first five-screen web app (PWA manifest / service worker not shipped): users see a simple vault balance, a live "decision stream" written in plain language, and one-tap actions — the CLOB complexity is hidden behind risk-managed strategies.
- Verified end-to-end on Monad testnet: margin deposit https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55 and IOC margin sell https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7 (orderbook 0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9).

Consumer angle: the user never touches an order ticket. They set a risk profile in plain language; our strategies (grid + mean-reversion + ML signal) generate the orders, our risk engine gates them, and Kuru's CLOB executes them — with every fill linked from the UI.
```

### 4.2 Best use of Perpl's API — $5,000（Perpl · All tracks）

```
Metrix AI includes a Perpl adapter so the same agent loop can route perpetual intents through Perpl's documented REST + trading WebSocket (mt:29 auth, mt:22 orders, mt:24 fills).

Honest status as of 2026-09-21:
- Code: apps/agent/src/execution/perpl-adapter.ts and apps/agent/src/market/perpl-rest.ts implement the protocol (Ed25519 sign-in, IOC flags, reconnect backoff).
- Runtime: PERPL_ENABLED defaults to false. We have NOT submitted a live Perpl order and have NO Perpl fill hash to show.
- Do not treat Kuru tx 0x0b1b77cc… as Perpl evidence — that hash is a Kuru orderbook IOC margin sell on Monad testnet.

Why it still belongs on this bounty: the adapter is venue-shaped (IntentOrder in, signed WS frame out) and sits behind the same RiskGate as Kuru. Live Perpl verification is the next milestone before final submission (feature freeze 10/5).
```

### 4.3 Best Analytics / Risk Tool — $3,000（Perpl · Track 01）

```
We built RiskGate — a real-time risk-monitoring engine and audit layer for an autonomous trading agent on Perpl/Kuru.

Six hard rules, evaluated on every order intent before execution:
R1 per-order notional ≤ 5% of live equity; R2 per-market exposure ≤ 30%; R3 daily-loss halt at -3% (blocks new risk, allows closes); R4 max-drawdown kill-switch at -10% from high-water mark — flattens every position and halts the agent; R5 slippage protection via on-chain minAmountOut; R6 client-order-id idempotency + per-market rate limiting.

The engine is fully observable: every verdict (pass or reject, with the exact rule and numbers) is written to a decision feed the user sees in real time on mobile, and persisted to PostgreSQL for post-hoc audit. Risk caps are hard-coded server-side; the product UI can tighten them but cannot loosen them beyond the ceiling — a deliberate design choice for user trust.

Observability today: every RiskGate verdict is pushed over WebSocket to the Trade screen and persisted to PostgreSQL when DATABASE_URL is set. Demo video (R3 halt close-up) is scheduled 10/9–10/11 — not recorded yet.
```

### 4.4 Best Agent Wallet Plugin — $2,500（MetaMask · Track 01）

```
We built an agent-executor wallet layer that gives an AI agent a safe, venue-agnostic trading superpower.

The execution layer abstracts the wallet behind a single IntentOrder interface (clientOrderId, venue, side, type, price, size, reason). Adapters implement quote/execute/cancel/positions per venue: today Kuru (onchain CLOB via official SDK) and Perpl (perp WS flow), with a simulation venue for safe testing. The agent wallet signs with a dedicated hot key whose capabilities are constrained by the risk engine — the wallet cannot sign an order the RiskGate has not approved.

This is the plugin shape a MetaMask Agent Wallet integration needs: intent in (parsed, risk-checked), signed transaction out, full audit trail back to the caller. The next milestone is packaging the executor as a MetaMask Agent Wallet plugin so an external agent can call it through the same interface.

Verified on Monad testnet via this wallet layer (Kuru, not Perpl):
https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55
https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7
```

### 4.5 Best Mobile Trading App on Monad — $10,000（Agora · Track 01）

```
Metrix AI is a mobile-first Next.js shell (five screens: vault, live decision stream, portfolio, chat commands, strategy settings) with Mera passkey auth and AUSD/MON balance + funding toward the agent vault.

Honest status as of 2026-09-21:
- Mera passkey register/login and AUSD balance read are implemented in apps/web/lib/mera.ts (needs HTTPS + matching rpId; live App hostname is gsym236998-metrix-ai.ms.show).
- Verified on-chain activity is Kuru testnet (deposit 0xe15c8218… / IOC 0x0b1b77cc…), not Perpl.
- Perpl live fills and a packaged PWA (manifest / service worker) are still in progress. Do not claim the Kuru IOC hash as a Perpl trade.
```

> 自用备注：Mera D1–D3 代码已进仓；评审可点 App 为魔搭 Docker 创空间 https://gsym236998-metrix-ai.ms.show（Running）。Pages 只作介绍页。Agora 全 spec 仍缺 Perpl 真成交 + 可安装 PWA。

### 4.6 Best Community Team Project — $5,000（Monad Foundation · All tracks）

```
Metrix AI is built and shipped in the open by a solo builder from the Metropolis community (OpenBuild ecosystem, China).

Everything is public from day one: the GitHub repo carries a complete commit history from registration through submission (CI-checked on every push), the project homepage is live on GitHub Pages, and the build process — including SDK integration pitfalls we documented and fixed (Kuru SDK ethers dual-instance issue, Perpl UA filtering) — is written up for other builders to reuse.

We also participate in the community loop: Monad Developers Discord, and we share our Kuru/Perpl integration notes with other Metropolis builders on request.
```

> 自用备注：Community bounty 官方交付物是 Profile 勾选已认证 community（已填 OpenBuild），不是 Discord handle。Discord 进服拿 Metropolis role 是 Dashboard 推荐卡，9/22 Submit 不依赖它。飞书不能替代。

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
| 为什么信 LLM 不乱交易？ | 交易决策路径没有模型。当前自然语言是正则兜底解析 + 确认卡 + RiskGate；接 LLM 后仍不能绕过风控。 |
| 网格策略在单边行情会亏吧？ | 会，这正是趋势过滤（EMA 休眠）+R4 回撤强平存在的原因 |
| Agent 钱包安全吗？ | 专用热钱包只放演示小额；六条硬规则服务端强制；恢复路径：R4 自动全平 |
| 和只调 GPT-4 写交易代码有什么区别？ | 每笔交易有完整审计链：信号快照、规则命中、风控裁决、tx hash，全部可回放；黑箱不可审计 |
| 后续计划？ | Perpl 真成交验证、可安装 PWA、Demo 视频 |
