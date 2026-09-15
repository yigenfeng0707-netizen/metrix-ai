import type { DecisionStatus, IntentOrder } from "@metrix/shared";
import { closeAllPositions, executeSim } from "./sim-adapter";

export interface ExecutionResult {
  status: DecisionStatus;
  txHash?: string;
  fillPrice?: string;
}

/**
 * 执行路由：venue 无关分发。
 * sim  → 模拟成交（Demo / 联调）
 * kuru → KuruSdk 真实下单（live）
 * perpl→ Perpl REST API（W3 接入，见 perpl-adapter TODO）
 */
export async function execute(intent: IntentOrder): Promise<ExecutionResult> {
  if (intent.venue === "sim") {
    const r = executeSim(intent);
    return { status: "executed", txHash: r.txHash, fillPrice: r.fillPrice };
  }

  if (intent.venue === "kuru") {
    const { placeMarket } = await import("./kuru-adapter");
    // R5 滑点保护：minAmountOut 由 CostEstimator.estimateMarketBuy 计算（W1 实现）
    const minAmountOut = "0";
    const txHash = await placeMarket(intent, minAmountOut);
    return { status: "executed", txHash, fillPrice: intent.price };
  }

  if (intent.venue === "perpl") {
    const { executePerpl } = await import("./perpl-adapter");
    const r = await executePerpl(intent);
    // true = 网关已接受转发；真实成交价由 mt:24 订单流回填（W2 接入）
    return { status: "executed", txHash: r.txRef, fillPrice: intent.price };
  }

  throw new Error(`unsupported venue: ${intent.venue}`);
}

export { closeAllPositions };
