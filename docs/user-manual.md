# Metrix AI 用户手册（评审 / 复现）

可点 App：https://gsym236998-metrix-ai.ms.show  
项目介绍页：https://yigenfeng0707-netizen.github.io/metrix-ai/  
仓库：https://github.com/yigenfeng0707-netizen/metrix-ai  
测试账号：见 [test-accounts.md](./test-accounts.md)（密码占位符，不要把真实密码写进 git）

## 1. 现在评审能打开什么

- **公网 HTTPS App（优先填表）**：上面的魔搭创空间地址。无痕可开 Home / Trade / Chat / Settings；Agent 为 sim 模式。
- **项目介绍页**：GitHub Pages，含架构说明与两条已验证的 Kuru 测试网交易。

请勿把 `http://localhost:3000` 填进报名表。

## 2. 本地打开完整 App（sim 模式，无需链上密钥）

这是开发者复现路径，不是评审 URL。需要 Node 20+。

```bash
git clone https://github.com/yigenfeng0707-netizen/metrix-ai
cd metrix-ai
npm install
npm run dev:agent    # http://localhost:8787
npm run dev:web      # http://localhost:3000
```

浏览器打开 http://localhost:3000 ：

1. Home：金库净值、今日盈亏、Agent 状态。
2. Trade：决策流（信号 → 风控 → 成交摘要）。**sim 卡片标明 Simulation，假 hash 不会跳 MonadScan。** Agent 每约 3 秒评估一次。
3. Portfolio：持仓；空仓是正常的，等网格/MM 触发。
4. Chat：试试「回撤超过 5% 就全平」→ 出现确认卡再批准（只会把 R4 从 -10% 收到 -5%；更松的请求会显示暂未生效）。当前是正则兜底，不是在线大模型。
5. Settings：网格/均值回归参数；可选 Mera passkey（需 HTTPS + 支持 PRF 的浏览器）。

Docker 全栈：`docker compose up -d --build`（默认仍是 sim）。

## 3. 链上验证（已发生，测试网）

这些是 **Kuru** 成交，不是 Perpl。

- 保证金充值：https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55
- IOC 保证金卖出：https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7

## 4. 常见问题

| 现象 | 原因 |
|---|---|
| 主页「Demo 视频」是占位 | 9/21 已收口分镜；成片未录。短版可对着公网 sim App 拍 |
| Chat 只认少量中英句子 | 当前是正则兜底，不是在线大模型 |
| Settings 里 Mera 失败 | 需在 App 域名 HTTPS 下用支持 PRF 的浏览器；rpId 绑定 `gsym236998-metrix-ai.ms.show` |
| 想看真实下单 | 配置 `apps/agent/.env` 后 `AGENT_MODE=testnet`；私钥只放本机 |

## 5. 不要做的事

- 不要把 Agent 私钥、RPC token、真实登录密码提交进 git 或报名表。
- 不要用临时 tunnel 当评审体验链接。
