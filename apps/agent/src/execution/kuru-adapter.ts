import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import type { IntentOrder } from "@metrix/shared";
import { config, riskLimits } from "../config";

/** R5：把 CostEstimator 输出按滑点 bps 打成下限（纯函数，便于单测）。 */
export function floorWithSlippage(estimatedOut: number, slippageBps: number): number {
  if (!(estimatedOut > 0) || !Number.isFinite(estimatedOut)) {
    throw new Error("R5: estimated output must be a positive finite number");
  }
  if (slippageBps < 0 || slippageBps >= 10_000) {
    throw new Error("R5: slippage bps out of range");
  }
  return estimatedOut * (1 - slippageBps / 10_000);
}

function toMinAmountRaw(human: number, decimals: number): string {
  const places = Math.min(Math.max(0, Math.floor(decimals)), 18);
  return ethers.utils.parseUnits(human.toFixed(places), places).toString();
}

/**
 * R5：用官方 CostEstimator 报价，再按 maxSlippageBps 计算链上 minAmountOut（整数 raw string）。
 * 询价失败则抛错，由执行层记为 rejected——不允许再退回 "0"（等于关掉滑点保护）。
 */
export async function computeMinAmountOut(intent: IntentOrder): Promise<string> {
  const provider = getProvider();
  const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, config.marketAddress);
  const size = Number(intent.size);
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error("R5: invalid order size for slippage estimate");
  }
  if (intent.side === "buy") {
    const est = await KuruSdk.CostEstimator.estimateMarketBuy(
      provider,
      config.marketAddress,
      marketParams,
      size,
    );
    const minHuman = floorWithSlippage(est.output, riskLimits.maxSlippageBps);
    return toMinAmountRaw(minHuman, Number(marketParams.baseAssetDecimals));
  }
  const est = await KuruSdk.CostEstimator.estimateMarketSell(
    provider,
    config.marketAddress,
    marketParams,
    size,
  );
  const minHuman = floorWithSlippage(est.output, riskLimits.maxSlippageBps);
  return toMinAmountRaw(minHuman, Number(marketParams.quoteAssetDecimals));
}

/**
 * Kuru 真实执行适配器（live 模式）。
 * 基于 @kuru-labs/kuru-sdk（docs.kuru.io/sdk/orderbook-sdk）。
 *
 * ⚠️ 注意：kuru-sdk 当前基于 ethers v5（Signer/ContractReceipt/BigNumber），
 *          本文件全部使用 v5 API，与 SDK 保持一致。
 *
 * ⚠️ W1 验证点（对照官方文档校准后再启用 live 模式）：
 *  ① 下单前置：必须先向保证金账户充值并 approve（否则 revert）
 *  ② GTC gas 估算 ×120% 缓冲
 *  ③ IOC 参数与返回 receipt 结构
 */

let providerCache: ethers.providers.JsonRpcProvider | null = null;

function getProvider(): ethers.providers.JsonRpcProvider {
  if (!config.rpcUrl) {
    throw new Error("Kuru live 模式需要配置 KURU_RPC_URL（见 .env.example）");
  }
  if (!providerCache) providerCache = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  return providerCache;
}

function getSigner(): ethers.Wallet {
  if (!config.rpcUrl || !config.privateKey) {
    throw new Error("Kuru live 模式需要配置 KURU_RPC_URL / KURU_PRIVATE_KEY（见 .env.example）");
  }
  const wallet = new ethers.Wallet(config.privateKey, getProvider());
  // kuru-sdk 内嵌独立 ethers 副本 → instanceof Signer 跨实例失败，挂 getSigner 兜底
  (wallet as unknown as { getSigner: () => ethers.Wallet }).getSigner = () => wallet;
  return wallet;
}

/** 公共测试网 RPC 偶发 ECONNRESET/超时——网络类错误指数退避重试（最多 3 次，总量 ~1.5s） */
async function withRpcRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String((err as Error)?.message ?? err);
      const isNetwork =
        /ECONNRESET|ETIMEDOUT|ENOTFOUND|missing response|SERVER_ERROR|network|timeout/i.test(msg);
      if (!isNetwork) throw err; // 非 network 错误（revert 等）不重试
      console.warn(`[kuru] ${label} 网络错误，第 ${i + 1}/3 次重试: ${msg.slice(0, 80)}`);
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

/** 前置：向保证金账户充值（token 为 ERC-20 地址，amountHuman 为人类可读金额） */
export async function depositToMargin(
  token: string,
  amountHuman: string,
  decimals: number,
): Promise<string> {
  const signer = getSigner();
  const receipt = await KuruSdk.MarginDeposit.deposit(
    signer,
    config.marginAccountAddress,
    await signer.getAddress(),
    token,
    amountHuman,
    decimals,
    true, // 自动 approve
  );
  return receipt.transactionHash;
}

/** 限价单（GTC，postOnly 做 maker）—— live 模式下网格策略首选 */
export async function placeLimit(intent: IntentOrder): Promise<string> {
  return withRpcRetry(async () => {
    const signer = getSigner();
    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(signer, config.marketAddress);
    const order = {
      price: intent.price!,
      size: intent.size,
      isBuy: intent.side === "buy",
      postOnly: true,
    };
    // W1 验证点 ②：gas 估算 × 120% 缓冲
    const gasEstimate = await KuruSdk.GTC.estimateGas(
      signer,
      config.marketAddress,
      marketParams,
      order,
    );
    const receipt = await KuruSdk.GTC.placeLimit(signer, config.marketAddress, marketParams, {
      ...order,
      txOptions: { gasLimit: gasEstimate.mul(120).div(100) },
    });
    return receipt.transactionHash;
  }, `placeLimit ${intent.side}`);
}

/** 市价单（IOC + fillOrKill）—— R5 滑点保护通过链上 minAmountOut 强制
 *  ⚠ W1 实测：不能用 IOC.placeMarket（其 estimateGas 对 Signer 连接的 Contract
 *  传 from 覆盖会报 "Contract with a Signer cannot override from"），
 *  改用底层 constructMarketSellTransaction + sendTransaction。
 */
export async function placeMarket(intent: IntentOrder, minAmountOut: string): Promise<string> {
  return withRpcRetry(async () => {
    const signer = getSigner();
    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(getProvider(), config.marketAddress);
    const isMargin = true; // 保证金模式：使用保证金账户资金（W1 已验证）
    const fillOrKill = true;
    const tx =
      intent.side === "buy"
        ? await KuruSdk.IOC.constructMarketBuyTransaction(
            signer, config.marketAddress, marketParams,
            intent.size, minAmountOut, isMargin, fillOrKill,
          )
        : await KuruSdk.IOC.constructMarketSellTransaction(
            signer, config.marketAddress, marketParams,
            intent.size, minAmountOut, isMargin, fillOrKill,
          );
    const sent = await signer.sendTransaction(tx);
    const receipt = await sent.wait(1);
    return receipt.transactionHash;
  }, `placeMarket ${intent.side}`);
}

/** 撤单 */
export async function cancelOrders(orderIds: string[]): Promise<string> {
  const signer = getSigner();
  const ids = orderIds.map((id) => ethers.BigNumber.from(id));
  const gasEstimate = await KuruSdk.OrderCanceler.estimateGas(
    signer,
    config.marketAddress,
    ids,
  );
  const receipt = await KuruSdk.OrderCanceler.cancelOrders(signer, config.marketAddress, ids, {
    gasLimit: gasEstimate.mul(120).div(100),
  });
  return receipt.transactionHash;
}
