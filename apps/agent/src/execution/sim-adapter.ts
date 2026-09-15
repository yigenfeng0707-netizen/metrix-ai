import type { IntentOrder } from "@metrix/shared";
import { store } from "../store";

const HEX = "0123456789abcdef";

function fakeTxHash(): string {
  let h = "0x";
  for (let i = 0; i < 64; i++) h += HEX[Math.floor(Math.random() * 16)];
  return h;
}

/** 模拟成交：即时按意图价格全额成交，并更新账户状态 */
export function executeSim(intent: IntentOrder): { txHash: string; fillPrice: string } {
  const price = Number(intent.price ?? 0);
  const size = Number(intent.size);

  store.updateAccount((a) => {
    if (intent.side === "buy") {
      a.vaultUsdc -= size * price;
      const pos = a.positions.find((p) => p.market === intent.market);
      if (pos) {
        pos.avgCost = (pos.avgCost * pos.size + price * size) / (pos.size + size);
        pos.size += size;
        pos.markPrice = price;
      } else {
        a.positions.push({
          market: intent.market,
          venue: intent.venue,
          size,
          avgCost: price,
          markPrice: price,
        });
      }
    } else {
      const pos = a.positions.find((p) => p.market === intent.market);
      if (pos) {
        const filled = Math.min(pos.size, size);
        pos.size = Math.max(0, pos.size - filled);
        pos.markPrice = price;
        a.vaultUsdc += filled * price;
      }
    }
    // 模拟日内盈亏波动（Demo 用；W2 由真实成交 PnL 替代）
    a.dayPnl += (Math.random() - 0.45) * 4;
  });

  return { txHash: fakeTxHash(), fillPrice: String(price) };
}

/** 全部平仓（R4 强平 / 用户指令），并暂停 Agent */
export function closeAllPositions(): void {
  store.updateAccount((a) => {
    for (const p of a.positions) {
      a.vaultUsdc += p.size * p.markPrice;
    }
    a.positions = [];
    a.agentStatus = "paused";
  });
}
