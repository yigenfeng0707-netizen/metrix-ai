# Round-1 粘贴稿（2026-09-22 通道开放当天用）

> 状态：**尚未提交**。2026-09-22 16:34 GMT+8 登录核对：Submission 页写窗口 **2 Oct to 14 Oct**，没有最终 Submit 按钮。10/2 再打开 https://hackathon.monad.xyz/dashboard → 粘贴后点最终 **Submit**（不要只点 SAVE CHANGES）。
> 体验链接填魔搭 App HTTPS，禁止 localhost / ngrok / cloudflared。GitHub Pages 只作项目介绍页。
> 英文进表单；中文是操作备注。
> **Discord：** Profile 的 Discord 为 optional。Dashboard「Join the server / Metropolis role」不在 Next steps 五步里。大陆打不开 Discord **不阻塞 9/22 Submit**。飞书不能填进 Discord 栏，也换不了 Metropolis role。

## 操作顺序（9/22）

1. 打开 https://hackathon.monad.xyz/dashboard ，GitHub 登录账号 **fengyigen**，确认 Track 01。
2. Live demo / 体验只填：`https://gsym236998-metrix-ai.ms.show` ；Homepage 填 Pages 介绍页。**Demo video 没成片就留空。**
3. GitHub：`https://github.com/yigenfeng0707-netizen/metrix-ai`
4. 长描述粘贴下面英文块。
5. 各 Bounty 勾选后粘贴对应段落（Perpl 段落已去掉 Kuru 哈希冒充）。可选勾选 Kuru 新市场，只用 4.7 诚实段（脚本有、没有深度盘）。
6. **10/2 还差这一个按钮：** 点最终 **Submit / Submit your project**（不要只点 SAVE CHANGES）。提交后截图。本文件不要改成「已提交」除非平台回执已拿到。

## 链接（只填这些）

| 字段 | 粘贴值 |
|---|---|
| Live demo / App | https://gsym236998-metrix-ai.ms.show |
| Project homepage | https://yigenfeng0707-netizen.github.io/metrix-ai/ |
| GitHub | https://github.com/yigenfeng0707-netizen/metrix-ai |
| User guide | https://github.com/yigenfeng0707-netizen/metrix-ai/blob/main/docs/user-manual.md |
| Test accounts | https://github.com/yigenfeng0707-netizen/metrix-ai/blob/main/docs/test-accounts.md |
| Demo video | https://raw.githubusercontent.com/yigenfeng0707-netizen/metrix-ai/main/docs/metrix-ai-demo-round1.mp4 （也可再传 B 站/YouTube） |

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
Metrix AI is an autonomous trading agent on Monad. Spot routes through Kuru's onchain CLOB; a Perpl adapter exists but is not live-verified. Deterministic strategies sit behind six risk rules. Chat commands go to a ModelScope Qwen model and return a structured command; without a studio token the UI says it used the local rules. Verified Kuru testnet txs are linked from the homepage. The Perpl demo is simulation, which the organizers accepted.
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
- Chat: ModelScope Qwen (`Qwen/Qwen3.5-35B-A3B`) returns a structured command, then a confirmation card and RiskGate. The model cannot sign or loosen risk. If the studio has no token, the same screen says the local rules were used.
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

## Bounty 4.6 Community team

```
Solo builder (fengyigen) shipping in the open. GitHub commit history is public; intro page and HTTPS demo are live. Profile community is OpenBuild. Discord Metropolis role is optional and is not a 9/22 Submit blocker.
```

## Bounty 4.7 Kuru new assets / markets（Bring New Assets and Markets to Kuru）

```
Metrix AI includes a Kuru MonadDeployer script (apps/agent/scripts/create-mtx-market.ts) that can deploy an MTX token + MTX/MON market with initial AMM seed (2 MON quote, 1.6M MTX base) via official @kuru-labs/kuru-sdk.

Honest status as of 2026-09-22:
- Script exists and is the intended path for this bounty.
- We have NOT published a live MTX market with order-book depth or organic volume. Do not treat the existing Kuru IOC hash as MTX-market trading evidence.
- Verified on-chain activity remains the two Kuru testnet txs listed under bounty 4.1 (margin deposit + IOC margin sell on an existing book).
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
