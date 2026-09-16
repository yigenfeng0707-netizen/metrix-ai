import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 8787),
  // sim = 模拟行情+成交 | testnet = Kuru 测试网真实交易 | live = Kuru 主网
  mode: (process.env.AGENT_MODE ?? "sim") as "sim" | "testnet" | "live",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 3000),

  // 模拟模式参数
  simPriceMin: Number(process.env.SIM_PRICE_MIN ?? 2950),
  simPriceMax: Number(process.env.SIM_PRICE_MAX ?? 3150),

  // Monad / Kuru
  rpcUrl: process.env.KURU_RPC_URL ?? "",
  privateKey: process.env.KURU_PRIVATE_KEY ?? "",
  marketAddress: process.env.KURU_MARKET_ADDRESS ?? "",
  marginAccountAddress: process.env.KURU_MARGIN_ACCOUNT_ADDRESS ?? "",
  /** testnet/live 模式的报价规模（MON/笔，用于 AMM 隐含价格查询与 IOC 买单） */
  quotePerTrade: Number(process.env.QUOTE_PER_TRADE ?? 0.0002),

  // Perpl（P1 永续模块）
  perpl: {
    /** 总开关：P1 功能，默认关闭；开启前需完成 API Key 注册 + 链上开户 */
    enabled: process.env.PERPL_ENABLED === "true",
    /** REST：主网 https://app.perpl.xyz/api ｜ 测试网 https://testnet.perpl.xyz/api */
    apiUrl: process.env.PERPL_API_URL ?? "https://app.perpl.xyz/api",
    /** WS：主网 wss://app.perpl.xyz ｜ 测试网 wss://testnet.perpl.xyz */
    wsUrl: process.env.PERPL_WS_URL ?? "wss://app.perpl.xyz",
    chainId: Number(process.env.PERPL_CHAIN_ID ?? 143),
    apiKey: process.env.PERPL_API_KEY ?? "",
    /** Ed25519 seed（64 hex），仅签名用，不能转出资金 */
    privateKey: process.env.PERPL_PRIVATE_KEY ?? "",
    accountId: Number(process.env.PERPL_ACCOUNT_ID ?? 0),
    /** 杠杆（百分之一）：200 = 2x */
    leverage: Number(process.env.PERPL_LEVERAGE ?? 200),
    /** 单笔名义金额（USDC） */
    orderUsd: Number(process.env.PERP_ORDER_USD ?? 100),
    /** 主网市场 ID：BTC=1, MON=10, ETH=20, SOL=31, HYPE=40, ZEC=50 */
    marketId: Number(process.env.PERP_MARKET_ID ?? 1),
    priceDecimals: Number(process.env.PERP_PRICE_DECIMALS ?? 1),
    sizeDecimals: Number(process.env.PERP_SIZE_DECIMALS ?? 5),
  },

  // ML 信号服务（PyTorch GPU，方案 §3.2 ml 服务）
  ml: {
    /** 总开关：默认关闭；Docker compose 中开启 */
    enabled: process.env.ML_ENABLED === "true",
    url: process.env.ML_URL ?? "http://localhost:8900",
    minHistory: Number(process.env.ML_MIN_HISTORY ?? 130),
    /** 入场概率阈值：p_up ≥ threshold 买 / ≤ 1-threshold 卖 */
    threshold: Number(process.env.ML_THRESHOLD ?? 0.6),
  },

  // LLM
  llmApiBase: process.env.LLM_API_BASE ?? "",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "",
} as const;

export const riskLimits = {
  /** R1 单笔限额：≤ 金库净值 5% */
  maxOrderPct: 0.05,
  /** R2 单市场敞口：≤ 金库净值 30% */
  maxExposurePct: 0.3,
  /** R3 日亏损熔断：当日 -3% 停止开新仓 */
  dailyLossHaltPct: -0.03,
  /** R4 最大回撤强平：高水位法 -10%，全平 + 暂停 */
  maxDrawdownPct: -0.1,
  /** R5 滑点保护：IOC minAmountOut ≥ 预估 × (1-0.5%) */
  maxSlippageBps: 50,
  /** R6 频率/幂等：同市场 5s 内 ≤1 单 */
  minSecondsBetweenOrders: 5,
} as const;
