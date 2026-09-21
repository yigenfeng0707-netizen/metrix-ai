# Round-1 粘贴稿（2026-09-22 通道开放当天用）

> 状态：**尚未提交**。本页只是把表单字段准备好。9/21 写就，9/22 打开 https://hackathon.monad.xyz/ 后人工粘贴。
> 体验链接填魔搭 App HTTPS，禁止 localhost / ngrok / cloudflared。GitHub Pages 只作项目介绍页。
> 英文进表单；中文是操作备注。

## 操作顺序（9/22）

1. 打开报名平台，确认 Track 01。
2. Live demo / 体验填：`https://gsym236998-metrix-ai.ms.show` ；Homepage 可填 Pages 介绍页。
3. GitHub：`https://github.com/yigenfeng0707-netizen/metrix-ai`
4. 长描述粘贴下面英文块。
5. 各 Bounty 勾选后粘贴对应段落（Perpl 段落已去掉 Kuru 哈希冒充）。
6. 提交后截图存档。本文件不要改成「已提交」除非平台回执已拿到。

## 链接（只填这些）

| 字段 | 粘贴值 |
|---|---|
| Live demo / App | https://gsym236998-metrix-ai.ms.show |
| Project homepage | https://yigenfeng0707-netizen.github.io/metrix-ai/ |
| GitHub | https://github.com/yigenfeng0707-netizen/metrix-ai |
| User guide | https://github.com/yigenfeng0707-netizen/metrix-ai/blob/main/docs/user-manual.md |
| Test accounts | https://github.com/yigenfeng0707-netizen/metrix-ai/blob/main/docs/test-accounts.md |
| Demo video | （未拍，10/9–11；此栏留空或写 Coming 10/11） |

## Project name

```
Metrix AI
```

## Tagline

```
An autonomous AI trading agent on Monad that spots on Kuru — every Kuru fill auditable on-chain.
```

## Short description

```
Metrix AI is an autonomous trading agent on Monad. Spot routes through Kuru's onchain CLOB; a Perpl adapter exists but is not live-verified. Deterministic strategies sit behind six risk rules. Chat commands use an offline parser (not a live LLM). Verified Kuru testnet txs are linked from the homepage.
```

## Long description

```
PROBLEM
AI agents can chat, but almost none of them can actually trade. The ones that "trade" are either black boxes or wrappers around centralized exchanges.

SOLUTION
Metrix AI manages a vault and executes spot through Kuru's fully-onchain CLOB on Monad. Every decision is a feed: signal snapshot → rule triggered → risk verdict → on-chain tx (when the venue is live).

HONEST SCOPE (round 1, 2026-09-22)
- Verified live: Kuru testnet margin deposit and IOC margin sell (links below).
- Coded, not live-verified: Perpl REST/WS adapter (PERPL_ENABLED defaults false).
- Chat: offline regex parser + confirmation card. No production LLM key is wired.
- Public App URL: https://gsym236998-metrix-ai.ms.show (ModelScope Docker Studio, Running). GitHub Pages is the project intro page, not the live agent UI.

RISK ENGINE
R1 per-order cap ≤ 5% of equity · R2 per-market exposure ≤ 30% · R3 daily-loss halt at -3% · R4 max-drawdown kill-switch at -10% · R5 Kuru IOC minAmountOut from CostEstimator × (1 − 50 bps) · R6 idempotency + per-market rate limiting. UI can tighten caps, never loosen them.

ON-CHAIN (Monad testnet, Kuru only)
https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55
https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7

TEAM
Solo builder (fengyigen).
```

## Bounty 4.1 Kuru

```
Metrix AI routes spot through Kuru's onchain order book using @kuru-labs/kuru-sdk (market params, GTC post-only, IOC isMargin, margin deposit).

Verified Monad testnet:
https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55 (margin deposit)
https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7 (IOC margin sell, orderbook 0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9)

Consumer UI: five mobile-first screens; the user never fills an order ticket. Strategies + RiskGate produce Intents; Kuru executes.
```

## Bounty 4.2 Perpl API（诚实版，无 Kuru 哈希）

```
Metrix AI has a Perpl adapter (apps/agent/src/execution/perpl-adapter.ts, perpl-rest.ts) matching Perpl's REST + trading WebSocket (mt:29 / mt:22 / mt:24).

As of 2026-09-21 we have not placed a live Perpl order and have no Perpl fill hash. PERPL_ENABLED defaults to false. Kuru tx 0x0b1b77cc is NOT Perpl evidence.

Live Perpl verification is scheduled before the 10/5 feature freeze.
```

## Bounty 4.3 Risk tool

```
RiskGate evaluates every IntentOrder before signing: R1–R6 as listed in the long description. Verdicts stream to the Trade screen over WebSocket and persist to PostgreSQL when DATABASE_URL is set. Caps are server-side; the UI cannot raise them. Demo video of an R3 halt is not recorded yet (window 10/9–11).
```

## Bounty 4.4 Agent wallet

```
A venue-agnostic IntentOrder executor (sim / kuru / perpl adapters) signs only after RiskGate. Verified Kuru testnet txs (same two MonadScan links as 4.1) were sent by this wallet layer. Not yet packaged as a MetaMask Agent Wallet plugin.
```

## Bounty 4.5 Agora mobile

```
Five-screen Next.js mobile shell + Mera passkey module (apps/web/lib/mera.ts) with AUSD/MON balance and a funding path to the agent vault. Public HTTPS App is https://gsym236998-metrix-ai.ms.show (passkey rpId binds to that hostname). GitHub Pages remains the intro page. On-chain proof remains Kuru testnet, not Perpl. PWA manifest is not shipped yet.
```

## 本地复现（不要填进「体验链接」）

```
git clone https://github.com/yigenfeng0707-netizen/metrix-ai
cd metrix-ai
npm install
npm run dev:agent
npm run dev:web
```

或 `docker compose up -d --build`。这是开发者复现路径，不是评审 URL。
