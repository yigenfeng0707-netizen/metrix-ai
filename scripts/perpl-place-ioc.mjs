/**
 * Place a tiny Perpl IOC once PERPL_* credentials + ACCOUNT_ID are ready.
 * Never prints key material. Exits non-zero on failure.
 *
 * Usage (from repo root):
 *   node scripts/perpl-place-ioc.mjs
 * Optional env: PERP_IOC_SIZE=1  (scaled size units)
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, "apps", "agent", ".env");

function readEnv(file) {
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

const env = readEnv(envPath);
const apiKey = env.PERPL_API_KEY;
const secret = (env.PERPL_PRIVATE_KEY || env.PERPL_API_KEY_SECRET || "").replace(/^0x/, "");
const wsUrl = env.PERPL_WS_URL || "wss://testnet.perpl.xyz";
const chainId = Number(env.PERPL_CHAIN_ID || 10143);
const accountId = Number(env.PERPL_ACCOUNT_ID || 0);
const marketId = Number(env.PERP_MARKET_ID || 64);
const leverage = Number(env.PERPL_LEVERAGE || 200);
const size = Number(process.env.PERP_IOC_SIZE || 1);

if (!apiKey || !secret) {
  console.log("BLOCKED missing PERPL_API_KEY / PERPL_PRIVATE_KEY — run perpl-enroll-testnet.mjs first");
  process.exit(2);
}
if (!accountId) {
  console.log("BLOCKED PERPL_ACCOUNT_ID=0 — complete createAccount on Exchange first (see docs/agora-perpl-live-path.md)");
  process.exit(3);
}
if (typeof WebSocket === "undefined") {
  console.log("BLOCKED Node WebSocket missing (need Node >= 22)");
  process.exit(4);
}

const priv = Buffer.from(secret, "hex");
let sn = 1;
let rq = 1;

function signIn() {
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("base64url");
  const canonical = [chainId, "trading-ws-signin", timestamp, nonce].join("\n");
  const signature = Buffer.from(ed.sign(Buffer.from(canonical), priv)).toString("base64url");
  return { mt: 29, chain_id: chainId, api_key: apiKey, timestamp, nonce, signature };
}

await new Promise((resolve, reject) => {
  const sock = new WebSocket(`${wsUrl}/ws/v1/trading`);
  const timer = setTimeout(() => {
    sock.close();
    reject(new Error("timeout"));
  }, 20_000);

  sock.onopen = () => sock.send(JSON.stringify(signIn()));
  sock.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    if (msg.mt === 19 || msg.mt === 23 || msg.mt === 26) {
      if (typeof msg.lfr === "number") rq = Math.max(rq, msg.lfr + 1);
      const order = {
        mt: 22,
        sn: sn++,
        rq: rq++,
        mkt: marketId,
        acc: accountId,
        t: 1, // open long
        p: 0, // market
        s: size,
        ms: 50,
        fl: 4, // IOC
        lv: leverage,
        lb: 0,
      };
      console.log("SEND_IOC", { mkt: marketId, acc: accountId, s: size, rq: order.rq });
      sock.send(JSON.stringify(order));
    } else if (msg.mt === 3) {
      clearTimeout(timer);
      console.log("STATUS", { code: msg.code, sn: msg.sn, detail: msg.detail ?? null });
      sock.close();
      if (msg.code === 0) resolve(undefined);
      else reject(new Error(`gateway code ${msg.code}`));
    } else if (msg.mt === 24) {
      console.log("ORDER_UPDATE", { fill_id: msg.fill_id ?? null, oid: msg.oid ?? null });
    }
  };
  sock.onerror = () => {
    clearTimeout(timer);
    reject(new Error("ws error"));
  };
  sock.onclose = (ev) => {
    if (ev?.code === 3401) {
      clearTimeout(timer);
      reject(new Error("auth failed close 3401"));
    }
  };
})
  .then(() => {
    console.log("OK gateway accepted IOC — verify fill in Perpl UI / GET /v1/trading/fills");
    process.exit(0);
  })
  .catch((e) => {
    console.log("FAIL", e.message);
    process.exit(1);
  });
