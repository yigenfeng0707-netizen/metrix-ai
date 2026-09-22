import type { DecisionStatus, ExecutionKind, IntentOrder } from "@metrix/shared";
import { closeAllPositions, executeSim } from "./sim-adapter";

export interface ExecutionResult {
  status: DecisionStatus;
  txHash?: string;
  fillPrice?: string;
  executionKind: ExecutionKind;
}

/**
 * 执行路由：venue 无关分发。
 * sim  → 模拟成交（Demo / 联调），不生成假 0x hash
 * kuru → KuruSdk 真实下单（testnet/live），txHash 为链上凭证
 * perpl→ Perpl 交易 WS（适配器已写；默认 PERPL_ENABLED=false，尚未主网/测试网成交验证）
 */
export async function execute(intent: IntentOrder): Promise<ExecutionResult> {
  if (intent.venue === "sim") {
    const r = executeSim(intent);
    return { status: "executed", fillPrice: r.fillPrice, executionKind: "simulation" };
  }

  if (intent.venue === "kuru") {
    const { placeMarket, computeMinAmountOut } = await import("./kuru-adapter");
    const minAmountOut = await computeMinAmountOut(intent);
    const txHash = await placeMarket(intent, minAmountOut);
    return { status: "executed", txHash, fillPrice: intent.price, executionKind: "onchain" };
  }

  if (intent.venue === "perpl") {
    const { executePerpl } = await import("./perpl-adapter");
    const r = await executePerpl(intent);
    // 网关已接受转发 ≠ 链上 hash；真实成交价由 mt:24 订单流回填（尚未接入）
    return { status: "executed", txHash: r.txRef, fillPrice: intent.price, executionKind: "venue_ack" };
  }

  throw new Error(`unsupported venue: ${intent.venue}`);
}

export { closeAllPositions };
