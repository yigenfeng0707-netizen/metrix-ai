import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import type { IntentOrder } from "@metrix/shared";
import { config } from "../config";

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

function getSigner(): ethers.Wallet {
  if (!config.rpcUrl || !config.privateKey) {
    throw new Error("Kuru live 模式需要配置 KURU_RPC_URL / KURU_PRIVATE_KEY（见 .env.example）");
  }
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  return new ethers.Wallet(config.privateKey, provider);
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
}

/** 市价单（IOC + fillOrKill）—— R5 滑点保护通过链上 minAmountOut 强制 */
export async function placeMarket(intent: IntentOrder, minAmountOut: string): Promise<string> {
  const signer = getSigner();
  const marketParams = await KuruSdk.ParamFetcher.getMarketParams(signer, config.marketAddress);
  // W1 验证点 ③
  const receipt = await KuruSdk.IOC.placeMarket(signer, config.marketAddress, marketParams, {
    approveTokens: true,
    size: intent.size,
    isBuy: intent.side === "buy",
    minAmountOut,
    isMargin: true,
    fillOrKill: true,
  });
  return receipt.transactionHash;
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
