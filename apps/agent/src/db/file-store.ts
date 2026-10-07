import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { AccountState, DecisionEvent } from "@metrix/shared";

/**
 * 无 PostgreSQL 时的本地 JSON 持久化（魔搭创空间 / 单容器冷启动友好）。
 * 路径：METRIX_DATA_DIR 或 /tmp/metrix-data（可写）或 ./data。
 */

interface Snapshot {
  version: 1;
  savedAt: number;
  account: AccountState;
  decisions: DecisionEvent[];
}

function resolveDir(): string {
  if (process.env.METRIX_DATA_DIR) return process.env.METRIX_DATA_DIR;
  for (const candidate of ["/tmp/metrix-data", join(process.cwd(), "data")]) {
    try {
      mkdirSync(candidate, { recursive: true });
      return candidate;
    } catch {
      /* try next */
    }
  }
  return join(process.cwd(), "data");
}

const DIR = resolveDir();
const FILE = join(DIR, "demo-store.json");
let ready = false;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

export function fileStoreEnabled(): boolean {
  return ready;
}

export function initFileStore(): boolean {
  try {
    mkdirSync(DIR, { recursive: true });
    ready = true;
    return true;
  } catch (err) {
    console.warn("[db/file] 无法创建数据目录：", (err as Error).message);
    ready = false;
    return false;
  }
}

export function loadSnapshot(): Snapshot | null {
  if (!ready || !existsSync(FILE)) return null;
  try {
    const raw = readFileSync(FILE, "utf8");
    const snap = JSON.parse(raw) as Snapshot;
    if (snap?.version !== 1 || !Array.isArray(snap.decisions)) return null;
    return snap;
  } catch {
    return null;
  }
}

function writeNow(account: AccountState, decisions: DecisionEvent[]): void {
  if (!ready) return;
  const snap: Snapshot = {
    version: 1,
    savedAt: Date.now(),
    account,
    decisions: decisions.slice(0, 200),
  };
  try {
    writeFileSync(FILE, JSON.stringify(snap), "utf8");
  } catch (err) {
    console.warn("[db/file] 写入失败：", (err as Error).message);
  }
}

/** 防抖写盘，避免主循环每 tick 同步 IO */
export function schedulePersist(account: AccountState, decisions: DecisionEvent[]): void {
  if (!ready) return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => writeNow(account, decisions), 400);
}

export function fileStats(decisionCount: number): {
  persisted: boolean;
  backend: "file";
  decisions: number;
  orders: number;
  path: string;
} {
  return {
    persisted: true,
    backend: "file",
    decisions: decisionCount,
    orders: decisionCount,
    path: FILE,
  };
}
