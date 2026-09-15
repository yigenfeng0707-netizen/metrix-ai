import { EventEmitter } from "node:events";
import type { AccountState, DecisionEvent, StrategyParams, ParsedCommand } from "@metrix/shared";

export interface StoredCommand {
  id: string;
  text: string;
  parsed: ParsedCommand;
  status: "pending" | "applied";
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

  params: StrategyParams = {
    grid: { enabled: true, lower: 2950, upper: 3150, grids: 8, orderSize: 0.02 },
    mr: { enabled: true, lookback: 40, zEntry: 1.8, orderSize: 0.01, cooldownMs: 20_000 },
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
