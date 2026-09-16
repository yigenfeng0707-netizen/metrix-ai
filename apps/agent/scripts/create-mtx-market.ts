/**
 * 在 Kuru 测试网部署新代币（MTX）+ 新市场 + 初始 AMM 流动性
 * 命中 Bounty: "Bring New Assets and Markets to Kuru" ($5,000)
 *
 * 用法: npx tsx scripts/create-mtx-market.ts
 * 前置: .env 配置 KURU_RPC_URL(测试网) / KURU_PRIVATE_KEY（余额 ≥ 2 MON + gas）
 */
import "dotenv/config";
import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";

// Monad 测试网 MonadDeployer（docs.kuru.io/contracts/Contract-addresses）
const DEPLOYER = "0xDacd06372cEb638640c9D8466A023b7362324e1A";

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.KURU_RPC_URL);
  const wallet = new ethers.Wallet(process.env.KURU_PRIVATE_KEY!, provider);
  (wallet as unknown as { getSigner: () => ethers.Wallet }).getSigner = () => wallet;
  console.log("deployer wallet:", await wallet.getAddress());

  // 代币参数：总量 200 万 MTX（18 位），20% 给开发者（=40 万，用于卖出侧），80% 进 AMM 金库
  const tokenParams = {
    name: "Metrix Token",
    symbol: "MTX",
    tokenURI: "https://yigenfeng0707-netizen.github.io/metrix-ai/mtx.json",
    initialSupply: ethers.utils.parseUnits("2000000", 18),
    dev: await wallet.getAddress(),
    supplyToDev: ethers.BigNumber.from(2000), // bps: 20%
  };

  // 市场参数：quote = 原生 MON。用 ParamCreator.calculatePrecisions 计算精度（官方推荐）
  const paramCreator = new KuruSdk.ParamCreator();
  const precisions = await paramCreator.calculatePrecisions(
    "2",        // currentQuote: 2 MON 进金库
    "1600000",  // currentBase: 160 万 MTX 进金库（80%）
    "1",        // maxPrice: 市场支持的最高价（1 MON / 1 MTX）
    "1000",     // minSize: 最小下单 1000 MTX
    50,         // tickInBps
  );
  console.log("precisions:", JSON.stringify(precisions, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));

  const marketParams = {
    nativeTokenAmount: ethers.utils.parseEther("2"), // 2 MON 流动性
    sizePrecision: precisions.sizePrecision,
    pricePrecision: precisions.pricePrecision,
    tickSize: precisions.tickSize,
    minSize: precisions.minSize,
    maxSize: precisions.maxSize,
    takerFeeBps: ethers.BigNumber.from(30),  // 0.3%
    makerFeeBps: ethers.BigNumber.from(10),  // 0.1%
  };

  console.log("deploying token + market (this tx also seeds AMM liquidity)...");
  const deployer = new KuruSdk.MonadDeployer();
  const result = await deployer.deployTokenAndMarket(
    wallet, DEPLOYER, tokenParams, marketParams,
    { project: "Metrix AI", homepage: "https://yigenfeng0707-netizen.github.io/metrix-ai/" },
  );
  console.log("✓ TOKEN :", result.tokenAddress);
  console.log("✓ MARKET:", result.marketAddress);
  console.log("✓ TX    :", result.hash);
  console.log("\n→ 把以上两个地址写入 .env 的 KURU_MARKET_ADDRESS（市场）并记入 README");
}
main().catch(e => { console.error("✗", e?.message ?? e); process.exit(1); });
