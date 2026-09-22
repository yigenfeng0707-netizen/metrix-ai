import { Pool } from "pg";
import type { DecisionEvent } from "@metrix/shared";

/**
 * W2 持久化：PostgreSQL write-through（node-postgres，纯 JS 零二进制依赖）。
 *
 * 未配置 DATABASE_URL 时返回 null，业务代码走纯内存模式（sim 演示不依赖数据库）。
 * 表结构对应 apps/agent/prisma/schema.prisma（Prisma 迁移作为 W3+ 演进项，
 * 当前采用 DDL 自动建表，hackathon 阶段最稳）。
 */

let pool: Pool | null = null;
let disabled = false;

export function getPool(): Pool | null {
  if (disabled || !process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 2000,
      query_timeout: 3000,
    });
  }
  return pool;
}

export const VAULT_ID = "demo";

const DDL = `
CREATE TABLE IF NOT EXISTS vaults (
  id            TEXT PRIMARY KEY,
  owner_address TEXT,
  agent_address TEXT,
  balances      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS decisions (
  id           TEXT PRIMARY KEY,
  vault_id     TEXT REFERENCES vaults(id),
  ts           TIMESTAMPTZ,
  strategy     TEXT,
  trigger      TEXT,
  book_snapshot JSONB,
  intent       JSONB,
  risk_verdict JSONB,
  llm_summary  TEXT,
  status       TEXT,
  tx_hash      TEXT,
  fill_price   TEXT
);
CREATE INDEX IF NOT EXISTS idx_decisions_vault_ts ON decisions(vault_id, ts DESC);
CREATE TABLE IF NOT EXISTS orders (
  id              BIGSERIAL PRIMARY KEY,
  decision_id     TEXT REFERENCES decisions(id),
  vault_id        TEXT,
  venue           TEXT,
  market          TEXT,
  side            TEXT,
  price           TEXT,
  size            TEXT,
  client_order_id TEXT UNIQUE,
  tx_hash         TEXT,
  fill_price      TEXT,
  status          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_vault ON orders(vault_id, created_at DESC);
CREATE TABLE IF NOT EXISTS risk_events (
  id        BIGSERIAL PRIMARY KEY,
  vault_id  TEXT,
  rule      TEXT,
  detail    JSONB,
  action    TEXT,
  ts        TIMESTAMPTZ DEFAULT now()
);
`;

/** 启动时建表 + 确保演示金库存在；失败返回 false（纯内存模式） */
export async function ensureTables(): Promise<boolean> {
  const db = getPool();
  if (!db) return false;
  try {
    await db.query(DDL);
    await db.query(
      `INSERT INTO vaults (id, owner_address, agent_address, balances)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [VAULT_ID, "0x-demo-owner", "0x-demo-agent", JSON.stringify({ usdc: 10000 })],
    );
    return true;
  } catch (err) {
    disabled = true;
    const stale = pool;
    pool = null;
    void stale?.end().catch(() => undefined);
    console.warn("[db] 连接失败，降级纯内存：", (err as Error).message);
    return false;
  }
}

let warned = false;

/** 决策 + 订单 write-through 落库（fire-and-forget，失败仅首次告警） */
export async function persistDecision(d: DecisionEvent): Promise<void> {
  const db = getPool();
  if (!db) return;
  try {
    await db.query(
      `INSERT INTO decisions
         (id, vault_id, ts, strategy, trigger, book_snapshot, intent, risk_verdict, llm_summary, status, tx_hash, fill_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id, VAULT_ID, new Date(d.ts), d.strategy, d.trigger,
        JSON.stringify(d.book), JSON.stringify(d.intent), JSON.stringify(d.risk),
        d.summary, d.status, d.txHash ?? null, d.fillPrice ?? null,
      ],
    );
    await db.query(
      `INSERT INTO orders
         (decision_id, vault_id, venue, market, side, price, size, client_order_id, tx_hash, fill_price, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (client_order_id) DO NOTHING`,
      [
        d.id, VAULT_ID, d.intent.venue, d.intent.market, d.intent.side,
        d.intent.price ?? null, d.intent.size, d.intent.clientOrderId,
        d.txHash ?? null, d.fillPrice ?? null, d.status,
      ],
    );
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn("[db] 持久化失败（后续静默）：", (err as Error).message);
    }
  }
}

/** 落库统计（供 API 展示，证明数据链完整） */
export async function dbStats(): Promise<{ persisted: boolean; decisions: number; orders: number } | null> {
  const db = getPool();
  if (!db) return null;
  try {
    const r = await db.query<{ decisions: string; orders: string }>(
      `SELECT
         (SELECT count(*) FROM decisions WHERE vault_id = $1) AS decisions,
         (SELECT count(*) FROM orders   WHERE vault_id = $1) AS orders`,
      [VAULT_ID],
    );
    return {
      persisted: true,
      decisions: Number(r.rows[0].decisions),
      orders: Number(r.rows[0].orders),
    };
  } catch {
    return null;
  }
}
