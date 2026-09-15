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
  };
}

export function currentSimPrice(): number {
  return simPrice;
}

// ---------- 真实行情（live 模式，W1 验证点 ①） ----------
// 对照 docs.kuru.io/sdk/orderbook-sdk 校准 L2Book 返回结构后启用。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchKuruBook(marketAddress: string, rpcUrl: string): Promise<BookSnapshot> {
  // const provider = new ethers.JsonRpcProvider(rpcUrl);
  // const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, marketAddress);
  // const orderbook = new ethers.Contract(marketAddress, orderbookAbi.abi, provider);
  // const l2Book = await orderbook.getL2Book();
  // TODO(W1): 解析 l2Book.bids[0] / l2Book.asks[0] 得到最优买卖价
  throw new Error("fetchKuruBook: W1 验证后启用（对照 Kuru 官方文档解析 L2Book）");
}
