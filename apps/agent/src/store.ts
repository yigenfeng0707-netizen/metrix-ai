import { EventEmitter } from "node:events";
import type { AccountState, DecisionEvent, StrategyParams, ParsedCommand, CommandApplyResult } from "@metrix/shared";
import { config } from "./config";
import { persistDecision } from "./db/pg";

export interface StoredCommand {
  id: string;
  text: string;
  parsed: ParsedCommand;
  status: "pending" | "applied" | "rejected";
  result?: CommandApplyResult;
  ts: number;
}

/**
 * 内存态仓库（骨架版）。
 * W2 接入 PostgreSQL + Prisma（模型见 prisma/schema.prisma），
 * 本文件改为仓储接口实现，业务代码不需要变动。
 */
class Store extends EventEmitter {
  decisions: DecisionEvent[] = [];
  commands = new Map<string, StoredCommand>();
  seenClientIds = new Set<string>();
  recentOrderTs = 0;

  account: AccountState = {
    vaultUsdc: 10_000,
    positions: [],
    dayPnl: 0,
    highWater: 10_000,
    drawdownPct: 0,
    agentStatus: "running",
  };

  // 策略参数按运行模式初始化：testnet 下网格间距 0.2%，与 AMM 单笔冲击匹配（自持振荡）
  params: StrategyParams =
    config.mode === "sim"
      ? {
          grid: { enabled: true, lower: 2950, upper: 3150, grids: 8, orderSize: 0.02 },
          mr: { enabled: true, lookback: 40, zEntry: 1.8, orderSize: 0.01, cooldownMs: 20_000 },
        }
      : {
          grid: { enabled: true, lower: 1.24e-6, upper: 1.26e-6, grids: 8, orderSize: 3000 },
          mr: { enabled: true, lookback: 40, zEntry: 2.2, orderSize: 2000, cooldownMs: 30_000 },
        };

  equity(): number {
    return (
      this.account.vaultUsdc +
      this.account.positions.reduce((s, p) => s + p.size * p.markPrice, 0)
    );
  }

  recordDecision(d: DecisionEvent): void {
    this.decisions.unshift(d);
    if (this.decisions.length > 500) this.decisions.pop();
    this.emit("decision", d);
    void persistDecision(d); // write-through，失败仅告警不阻塞主循环
  }

  updateAccount(fn: (a: AccountState) => void): void {
    fn(this.account);
    const eq = this.equity();
    this.account.highWater = Math.max(this.account.highWater, eq);
    this.account.drawdownPct =
      this.account.highWater > 0 ? (eq - this.account.highWater) / this.account.highWater : 0;
    this.emit("account", this.account);
  }
}

export const store = new Store();
