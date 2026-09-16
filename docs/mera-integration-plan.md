# Mera 接入决策备忘 + 实施计划（冲 Agora $10k Bounty）

> 结论：**值得冲。** 官方文档完备（docs.monad.xyz/guides/mera），核心接入约 1.5 天，含 AUSD 展示约 2.5 天，在 10/5 功能冻结前完成无压力。
> 拍板：✅ 做。排期 W2（9/24–9/26），不阻塞 9/22 首轮提交。

---

## 1. Agora $10k Bounty 官方要求（原文）

> "Build a mobile app authenticating via **Mera**, holding an **AUSD balance**, and executing trades through **Perpl**."

三要素拆解 → 我们的现状：

| 要素 | 要求 | 现状 | 缺口 |
|---|---|---|---|
| Mera 认证 | 用户通过 Mera passkey 登录 App | wagmi 浏览器钱包登录 | **Mera passkey 流程（本计划主体）** |
| AUSD 余额 | App 内展示/持有 AUSD | 显示 MON/USDC | **AUSD 余额展示 + 充值引导** |
| Perpl 交易 | 通过 Perpl 执行交易 | ✅ IOC margin 卖出已验证（tx 0x0b1b77cc） | 把执行账户切到 Mera 派生账户 |

## 2. 技术方案（已核对官方文档）

### 2.1 认证流（Mera = 从 passkey 派生标准 EOA，无需合约部署/无 bundler）
```
注册: createPasskeyWithPrfOutput() → prfOutput(32B) → 派生 EVM 密钥
登录: getPasskeyPrfOutput({ rpId, credentialId }) → 同一密钥
签名: createSecp256k1SigningSession({ privateKey }) → toViemAccount() → viem client
```
- 依赖：`@category-labs/mera` + `viem` + `@scure/bip32` + `@scure/bip39`（全开源，GitHub category-labs/mera）
- 派生的是**标准 EOA**（BIP-44 m/44'/60'/0'/0/0），可导入 MetaMask/Rabby —— 用户资产完全自主

### 2.2 AUSD（主网官方地址，来自 Kuru 合约文档）
- 合约：`0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`
- 余额展示：viem `readContract(erc20Abi, balanceOf)` 标准模式

### 2.3 与现有架构的接法
```
Mera passkey → 派生 EOA（用户身份/资金入口）
    ↓ 用户充值 AUSD/MON 到 Agent 金库（现有 deposit 流程不变）
Agent 热钱包（风控后）→ Kuru 现货 + Perpl 永续（现有执行层不变）
```
即：**Mera 替换"用户身份认证层"，Agent 执行层零改动** —— 架构上最省事，且叙事完整（passkey 人在前、agent 在后）。

### 2.4 关键技术坑（官方文档明示）
1. ⚠️ **Monad 按"声明 gasLimit"收费**：Mera 发交易必须传显式 `gas`，不能用估算
2. ⚠️ 桌面 Chrome 上只有保存在 **Google 密码管理器**的 passkey 返回 PRF；本地 profile 会 `PRF_UNAVAILABLE` → 开发用 `mera.category.xyz/demo` 先验证环境
3. ⚠️ `rpId` 绑定域名：换域名 = 账户丢失（提交的 demo 域名要固定，用 GitHub Pages 或固定 VPS 域名）
4. HTTPS 必须（GitHub Pages 天然满足）
5. 会话二选一：交易场景用"持有会话"模式（模式 A）

## 3. 实施排期（3 个工作日，9/24–9/26）

| 天 | 任务 | 产出 |
|---|---|---|
| D1 | web 集成 Mera：passkey 注册/登录 → 派生账户 → 显示地址 | 可登录的 PWA |
| D2 | AUSD：余额展示（viem readContract）+ 充值到 Agent 金库的引导流；Gas 显式化改造 | 满足 bounty 前两条 |
| D3 | 联调：Mera 账户充值的资金走 Agent → Kuru/Perpl 真实成交；Demo 录屏素材 | $10k 材料齐 |

## 4. 风险
- PRF 兼容性（部分浏览器/密码管理器不支持）→ 官方 demo 可预先自测；不支持的用户回退 wagmi 登录（不影响主流程）
- 测试网 AUSD 可能不存在 → AUSD 展示仅主网生效；测试网演示用 MON/USDC 替代展示

## 5. 决策记录
- 9/16：调研完成，结论"冲"；排期 9/24–9/26；10/5 为放弃截止点
