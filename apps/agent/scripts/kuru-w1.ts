/**
 * W1 Kuru 集成验证脚本（完整方案 §5.1 / README 验证点）
 *
 * 用法（在 apps/agent 下，需先配置 .env）：
 *   npx tsx scripts/kuru-w1.ts check              # 环境自检：RPC/链ID/钱包/市场参数
 *   npx tsx scripts/kuru-w1.ts book               # 拉取 L2 订单簿，验证行情解析
 *   npx tsx scripts/kuru-w1.ts deposit <token> <amount> <decimals>   # 保证金充值（真实交易！）
 *   npx tsx scripts/kuru-w1.ts order <price> <size>                  # GTC postOnly 下单+撤单（真实交易！）
 *
 * 安全设计：
 *  - check / book 为只读，随时可跑
 *  - deposit / order 会发起真实链上交易，必须追加 --yes 才会执行
 *  - 建议流程：测试网全流程 → 主网小额（< $50）
 */
import "dotenv/config";
import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";

const RPC = process.env.KURU_RPC_URL ?? "";
const PK = process.env.KURU_PRIVATE_KEY ?? "";
const MARKET = process.env.KURU_MARKET_ADDRESS ?? "";
const MARGIN = process.env.KURU_MARGIN_ACCOUNT_ADDRESS ?? "";
const CONFIRMED = process.argv.includes("--yes");
const [cmd, ...args] = process.argv.slice(2).filter((a) => a !== "--yes");

function signer(): ethers.Wallet {
  if (!RPC || !PK) {
    console.error("缺少 KURU_RPC_URL / KURU_PRIVATE_KEY（见 .env.example）");
    process.exit(1);
  }
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK, provider);
  // kuru-sdk 内嵌独立 ethers 副本，instanceof Signer 跨实例必失败 →
  // 挂上 getSigner() 让 SDK 的 duck-typing 分支拿到钱包本体
  (wallet as unknown as { getSigner: () => ethers.Wallet }).getSigner = () => wallet;
  return wallet;
}

/** ParamFetcher/getL2Book 等只读调用必须用 provider（Signer 传 from override 会报错） */
function provider(): ethers.providers.JsonRpcProvider {
  if (!RPC) {
    console.error("缺少 KURU_RPC_URL（见 .env.example）");
    process.exit(1);
  }
  return new ethers.providers.JsonRpcProvider(RPC);
}

async function check(): Promise<void> {
  const s = signer();
  const net = await s.provider.getNetwork();
  console.log(`✓ RPC 连接: chainId=${net.chainId}${net.chainId === 143 ? " (Monad 主网)" : net.chainId === 10143 ? " (Monad 测试网)" : ""}`);
  console.log(`✓ 钱包: ${await s.getAddress()}`);
  const bal = await s.provider.getBalance(await s.getAddress());
  console.log(`✓ MON 余额: ${Number(bal) / 1e18}`);
  if (!MARKET) {
    console.warn("⚠ 未配置 KURU_MARKET_ADDRESS，跳过市场参数检查");
    return;
  }
  const mp = await KuruSdk.ParamFetcher.getMarketParams(provider(), MARKET);
  console.log("✓ 市场参数:", JSON.stringify(mp, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
}

async function book(): Promise<void> {
  const p = provider();
  const s = signer();
  if (!MARKET) {
    console.error("缺少 KURU_MARKET_ADDRESS");
    process.exit(1);
  }
  const mp = await KuruSdk.ParamFetcher.getMarketParams(p, MARKET);
  const abi = (await import("@kuru-labs/kuru-sdk/abi/OrderBook.json")).default;
  const ob = new ethers.Contract(MARKET, abi.abi, p);
  const l2 = await ob.getL2Book();
  // ⚠ W1 验证点：核对 bids/asks 字段结构与精度（baseAssetDecimals/quoteAssetDecimals）
  console.log("L2Book 原始结构（前 3 档）:");
  console.log("  bids:", JSON.stringify((l2.bids ?? []).slice(0, 3)));
  console.log("  asks:", JSON.stringify((l2.asks ?? []).slice(0, 3)));
  console.log("  vaultParams:", JSON.stringify(await ob.getVaultParams?.() ?? "n/a").slice(0, 200));
  console.log("\n→ 请把以上结构与 docs.kuru.io/sdk/orderbook-sdk 对照后，回填 agent/src/market/kuru-feed.ts 的解析逻辑");
}

async function deposit(token: string, amount: string, decimals: string): Promise<void> {
  const s = signer();
  if (!MARGIN) {
    console.error("缺少 KURU_MARGIN_ACCOUNT_ADDRESS（Kuru 下单前置）");
    process.exit(1);
  }
  if (!CONFIRMED) {
    console.error(`⚠ 将向保证金账户真实充值 ${amount}（token=${token}）。确认请追加 --yes`);
    process.exit(1);
  }
  const receipt = await KuruSdk.MarginDeposit.deposit(
    s, MARGIN, await s.getAddress(), token, amount, Number(decimals), true,
  );
  console.log("✓ 充值成功 tx:", receipt.transactionHash);
}

async function order(price: string, size: string): Promise<void> {
  const p = provider();
  const s = signer();
  if (!CONFIRMED) {
    console.error(`⚠ 将真实挂单 GTC postOnly: sell ${size} MON @ ${price} USDC，随后撤单。确认请追加 --yes`);
    process.exit(1);
  }
  const mp = await KuruSdk.ParamFetcher.getMarketParams(p, MARKET);
  // 精度换算：pricePrecision/sizePrecision 为 10^n 形式
  const priceDec = Math.log10(Number(mp.pricePrecision.toString()));
  const sizeDec = Math.log10(Number(mp.sizePrecision.toString()));
  const priceBn = ethers.utils.parseUnits(price, priceDec);
  const sizeBn = ethers.utils.parseUnits(size, sizeDec);
  // W1 验证结论：placeLimit 内部对 Signer+from 有兼容 bug，
  // 直接使用底层 constructSellOrderTransaction + sendTransaction
  const tx = await KuruSdk.GTC.constructSellOrderTransaction(s, MARKET, priceBn, sizeBn, true, p);
  const sent = await s.sendTransaction(tx);
  const receipt = await sent.wait(1);
  console.log("✓ 挂单成功 tx:", receipt.transactionHash);
  for (const log of receipt.logs) {
    if (log.topics[0] === ethers.utils.id("OrderCreated(uint40,address,uint96,uint32,bool)")) {
      const id = ethers.BigNumber.from(log.topics[1]);
      console.log("✓ orderId:", id.toString(), "→ 尝试撤单…");
      const rc = await KuruSdk.OrderCanceler.cancelOrders(s, MARKET, [id]);
      console.log("✓ 撤单成功 tx:", rc.transactionHash);
    }
  }
}

/** IOC 市价卖出（isMargin=true，用保证金里的 MON）；W1 端到端验证用 */
async function iocSell(size: string, minOut = "0"): Promise<void> {
  const p = provider();
  const s = signer();
  if (!CONFIRMED) {
    console.error(`⚠ 将 IOC 市价卖出 ${size} MON（isMargin=true）。确认请追加 --yes`);
    process.exit(1);
  }
  const mp = await KuruSdk.ParamFetcher.getMarketParams(p, MARKET);
  const receipt = await KuruSdk.IOC.placeMarket(
    s, MARKET, mp,
    { approveTokens: false, size, isBuy: false, minAmountOut: minOut, isMargin: true, fillOrKill: false },
  );
  console.log("✓ IOC 卖出成功 tx:", receipt.transactionHash);
}

async function main(): Promise<void> {
  switch (cmd) {
    case "check": return check();
    case "book": return book();
    case "deposit": return deposit(args[0], args[1], args[2]);
    case "order": return order(args[0], args[1]);
    case "ioc-sell": return iocSell(args[0], args[1]);
    default:
      console.log(__doc__);
  }
}

const __doc__ = `
W1 验证脚本:
  npx tsx scripts/kuru-w1.ts check
  npx tsx scripts/kuru-w1.ts book
  npx tsx scripts/kuru-w1.ts deposit <token> <amount> <decimals> [--yes]
  npx tsx scripts/kuru-w1.ts order <price> <size> [--yes]
`;
main().catch((e) => {
  console.error("✗", e?.message ?? e);
  process.exit(1);
});
