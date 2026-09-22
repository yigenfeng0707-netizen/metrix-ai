import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import type { BookSnapshot } from "@metrix/shared";
import { config } from "../config";

// ---------- 模拟行情（sim 模式默认） ----------
// 随机游走 + 微幅波动，供前端联调与 Demo 排练。

let simPrice = 3050;

export function fetchSimBook(): BookSnapshot {
  const drift = (Math.random() - 0.5) * 4;
  simPrice = Math.min(config.simPriceMax, Math.max(config.simPriceMin, simPrice + drift));
  const spread = 0.4 + Math.random() * 0.3;
  return {
    market: "SIM WETH/USDC",
    ts: Date.now(),
    bestBid: Number((simPrice - spread / 2).toFixed(2)),
    bestAsk: Number((simPrice + spread / 2).toFixed(2)),
    quoteSource: "sim",
  };
}

export function currentSimPrice(): number {
  return simPrice;
}

// ---------- 真实行情（testnet/live 模式） ----------
// 优先 Kuru SDK L2（CLOB 档位 + AMM vault 合并，官方 getL2OrderBook）。
// L2 为空或解析失败时，诚实降级为 CostEstimator AMM 隐含价，不假装 CLOB。

let providerCache: ethers.providers.JsonRpcProvider | null = null;
let mpCache: Awaited<ReturnType<typeof KuruSdk.ParamFetcher.getMarketParams>> | null = null;
let ammFallbackWarned = false;

function getProvider(rpcUrl = config.rpcUrl): ethers.providers.JsonRpcProvider {
  if (!rpcUrl) throw new Error("Kuru 行情需要 KURU_RPC_URL");
  if (!providerCache) providerCache = new ethers.providers.JsonRpcProvider(rpcUrl);
  return providerCache;
}

async function fetchAmmImpliedBook(): Promise<BookSnapshot> {
  const p = getProvider();
  if (!mpCache) {
    mpCache = await KuruSdk.ParamFetcher.getMarketParams(p, config.marketAddress);
  }
  const est = await KuruSdk.CostEstimator.estimateMarketBuy(
    p, config.marketAddress, mpCache, config.quotePerTrade,
  );
  const baseOut = Number(est.output);
  if (!(baseOut > 0)) throw new Error("AMM 询价 output 无效");
  const price = config.quotePerTrade / baseOut;
  const spread = price * 0.0004;
  return {
    market: "MTX/MON · AMM 隐含价（非 CLOB 最优档）",
    ts: Date.now(),
    bestBid: Number((price - spread / 2).toFixed(10)),
    bestAsk: Number((price + spread / 2).toFixed(10)),
    quoteSource: "kuru_amm",
  };
}

/**
 * 用官方 SDK 解析 L2（getL2Book hex + AMM vault）。
 * 无可用买卖档时抛错，由 fetchTestnetBook 降级 AMM。
 */
export async function fetchKuruBook(marketAddress: string, rpcUrl: string): Promise<BookSnapshot> {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const mp = await KuruSdk.ParamFetcher.getMarketParams(provider, marketAddress);
  const l2 = await KuruSdk.OrderBook.getL2OrderBook(provider, marketAddress, mp);
  const bids = Array.isArray(l2.bids) ? l2.bids : [];
  const asks = Array.isArray(l2.asks) ? l2.asks : [];
  const bidPx = bids.map((lvl) => Number(lvl?.[0])).filter((n) => Number.isFinite(n) && n > 0);
  const askPx = asks.map((lvl) => Number(lvl?.[0])).filter((n) => Number.isFinite(n) && n > 0);
  if (!bidPx.length || !askPx.length) {
    throw new Error("Kuru L2 盘口为空（无 bid/ask）");
  }
  const bestBid = Math.max(...bidPx);
  const bestAsk = Math.min(...askPx);
  if (!(bestAsk >= bestBid)) {
    throw new Error("Kuru L2 买卖价交叉或无效");
  }
  return {
    market: "MTX/MON · Kuru L2",
    ts: Date.now(),
    bestBid,
    bestAsk,
    quoteSource: "kuru_l2",
  };
}

export async function fetchTestnetBook(): Promise<BookSnapshot> {
  if (!config.rpcUrl || !config.marketAddress) {
    throw new Error("testnet/live 需要 KURU_RPC_URL / KURU_MARKET_ADDRESS");
  }
  try {
    return await fetchKuruBook(config.marketAddress, config.rpcUrl);
  } catch (err) {
    if (!ammFallbackWarned) {
      ammFallbackWarned = true;
      console.warn(
        "[kuru-feed] L2 盘口不可用，降级 AMM CostEstimator 隐含价（非 CLOB 最优档）:",
        (err as Error).message,
      );
    }
    return fetchAmmImpliedBook();
  }
}
