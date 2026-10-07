# Agora / Perpl 真成交路径（操作清单）

> 状态（2026-10-07）：Agent 钱包 `0x56deA587…C1E6` **主网 AUSD = 0**；测试网 AUSD 合约读余额失败/无余额。  
> 无 ≥100 aUSD 抵押金时 **无法** `createAccount` / 真 IOC。代码与脚本已打通，差用户资金与钱包确认。

## 官方三要素（Agora $10k）

1. Mera passkey 登录（App Settings 已实现）
2. AUSD 余额展示（Settings 主网 `balanceOf`）
3. **至少一笔 Perpl 真成交**（当前阻塞）

## 最短路径（测试网优先）

### 1. 准备抵押

- 目标地址：Agent 热钱包（与 `KURU_PRIVATE_KEY` 对应，见 Settings / README）
- 测试网开户常见门槛：≥ **100 aUSD**（以 `GET https://testnet.perpl.xyz/api/v1/pub/context` 的 `min_account_open_amount` 为准）
- 黑客松 perks **没有** AUSD 券；需自行获取测试网 aUSD 或改走主网并自备资金

### 2. 建 Perpl profile

1. 打开 https://testnet.perpl.xyz （主网则 https://app.perpl.xyz）
2. 连接 Agent 钱包（或导入同一私钥的 MetaMask/Rabby）
3. 按 UI 完成 profile / 首次登录

### 3. 注册 API Key（本机，不入库）

```bash
cd metrix-ai
node scripts/perpl-enroll-testnet.mjs
```

成功时会把 `PERPL_API_KEY` / `PERPL_PRIVATE_KEY` 写入 `apps/agent/.env`（已 gitignore）。  
若 `enroll` 返回 **404**：说明该地址还没有 Perpl profile → 回到步骤 2。

### 4. 链上开户 `createAccount`

- 文档：Perpl Networks + account creation walkthrough
- 用钱包对 Exchange 合约调用 `createAccount(uint256 amountCNS)` 并转入抵押
- 记下返回的 **account id**，写入：

```env
PERPL_ACCOUNT_ID=<id>
PERPL_ENABLED=true
PERPL_API_URL=https://testnet.perpl.xyz/api
PERPL_WS_URL=wss://testnet.perpl.xyz
PERPL_CHAIN_ID=10143
PERP_MARKET_ID=64
```

### 5. 下一笔 IOC

```bash
node scripts/perpl-place-ioc.mjs
```

或重启 Agent（`PERPL_ENABLED=true`）让 `perp-trend` 自动路由。  
成功后把 gateway `rq` / fill id / Perpl UI 截图补进提交材料与视频。

### 6. 视频（≤2 min）

必须同镜出现：passkey 登录 → AUSD 余额 → Perpl 成交证据。  
现有 YouTube `FF9rt_Gxd8U` **不含** Perpl 真成交，不能单独冲 Agora。

## 若截止前仍无法成交

在提交页 **REMOVE「Best Mobile Trading App（Agora）」**，并更新 short description，避免「选了却交不上」。

## 相关文件

| 文件 | 作用 |
|---|---|
| `apps/agent/src/execution/perpl-adapter.ts` | WS 认证 + mt:22 下单 + 等待 mt:3 |
| `apps/agent/src/market/perpl-rest.ts` | REST 六段 canonical 签名 |
| `apps/web/components/PerplRiskPanel.tsx` | 公开行情 + RiskGate 证据 |
| `GET /vaults/demo/perpl/status` | 就绪检查（不泄露密钥） |
