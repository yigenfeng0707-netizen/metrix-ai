# Metrix AI 用户手册（评审 / 复现）

公开入口：https://yigenfeng0707-netizen.github.io/metrix-ai/  
仓库：https://github.com/yigenfeng0707-netizen/metrix-ai  
测试账号：见 [test-accounts.md](./test-accounts.md)（密码占位符，不要把真实密码写进 git）

## 1. 现在评审能打开什么

- **公网 HTTPS（9/22 首轮）**：上面的项目主页（GitHub Pages）。含架构说明与两条已验证的 Kuru 测试网交易。
- **完整五屏 App**（金库 / 决策流 / 持仓 / 指令 / 设置）：需要本机或 Docker 跑 Agent + Next。还没有单独的稳定公网 App 域名。步骤见 [deploy-https.md](./deploy-https.md)。

请勿把 `http://localhost:3000` 填进报名表。

## 2. 本地打开完整 App（sim 模式，无需链上密钥）

需要 Node 20+。

```bash
git clone https://github.com/yigenfeng0707-netizen/metrix-ai
cd metrix-ai
npm install
npm run dev:agent    # http://localhost:8787
npm run dev:web      # http://localhost:3000
```

浏览器打开 http://localhost:3000 ：

1. Home：金库净值、今日盈亏、Agent 状态。
2. Trade：决策流（信号 → 风控 → 成交摘要）。sim 模式每约 3 秒评估一次。
3. Portfolio：持仓；空仓是正常的，等网格/MM 触发。
4. Chat：试试「回撤超过 5% 就全平」→ 出现确认卡再批准。
5. Settings：网格/均值回归参数；可选 Mera passkey（需 HTTPS + 支持 PRF 的浏览器）。

Docker 全栈：`docker compose up -d --build`（默认仍是 sim）。

## 3. 链上验证（已发生，测试网）

这些是 **Kuru** 成交，不是 Perpl。

- 保证金充值：https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55
- IOC 保证金卖出：https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7

## 4. 常见问题

| 现象 | 原因 |
|---|---|
| 主页「Demo 视频」是占位 | 拍摄窗口 10/9–11，尚未录 |
| Chat 只认少量中英句子 | 当前是正则兜底，不是在线大模型 |
| Settings 里 Mera 失败 | localhost 或浏览器无 PRF；换 GitHub Pages 域名或 Chrome + 密码管理器 |
| 想看真实下单 | 配置 `apps/agent/.env` 后 `AGENT_MODE=testnet`；私钥只放本机 |

## 5. 不要做的事

- 不要把 Agent 私钥、RPC token、真实登录密码提交进 git 或报名表。
- 不要用临时 tunnel 当评审体验链接。
