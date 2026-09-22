/**
 * One-shot Perpl TESTNET API-key enrollment for the existing agent wallet.
 * Writes PERPL_* into apps/agent/.env. Never prints key material.
 * Does not call createAccount and does not spend collateral.
 */
import { createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(pathToFileURL(path.join(root, "apps", "agent", "package.json")).href);
const { ethers } = require("ethers");

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const envPath = path.join(root, "apps", "agent", ".env");
const API = "https://testnet.perpl.xyz/api";
const CHAIN_ID = 10143;
const ORIGINS = ["https://testnet.perpl.xyz", "https://gsym236998-metrix-ai.ms.show"];

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

function upsert(file, pairs) {
  let text = fs.readFileSync(file, "utf8");
  if (!text.endsWith("\n")) text += "\n";
  for (const [k, v] of Object.entries(pairs)) {
    const line = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : text + line + "\n";
  }
  fs.writeFileSync(file, text);
}

async function post(origin, pathname, body) {
  const res = await fetch(`${API}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let json = null;
  try {
    json = JSON.parse(raw);
  } catch {
    json = { raw: raw.slice(0, 240) };
  }
  return { status: res.status, json };
}

const env = readEnv(envPath);
const wallet = new ethers.Wallet(env.KURU_PRIVATE_KEY);
const privateKey = ed.utils.randomPrivateKey();
const publicKey = await ed.getPublicKeyAsync(privateKey);
const publicKeyHex = "0x" + Buffer.from(publicKey).toString("hex");

let payload = null;
let originUsed = "";
for (const origin of ORIGINS) {
  const res = await post(origin, "/v1/api-key/payload", {
    chain_id: CHAIN_ID,
    address: wallet.address,
    public_key: publicKeyHex,
    scope_mask: 3,
    label: "metrix-ai-testnet",
  });
  console.log("payload", origin, res.status, res.json?.typed_data ? "typed_data" : JSON.stringify(res.json).slice(0, 300));
  if (res.status === 200 && res.json?.typed_data && res.json?.mac) {
    payload = res.json;
    originUsed = origin;
    break;
  }
}

if (!payload) {
  console.log("ENROLL_BLOCKED no payload");
  process.exit(2);
}

const { EIP712Domain, ...types } = payload.typed_data.types;
const signature = await wallet._signTypedData(payload.typed_data.domain, types, payload.typed_data.message);
const digest = ethers.utils._TypedDataEncoder.hash(payload.typed_data.domain, types, payload.typed_data.message);
const pop = await ed.signAsync(ethers.utils.arrayify(digest), privateKey);
const popSignature = "0x" + Buffer.from(pop).toString("hex");

const enrolled = await post(originUsed, "/v1/api-key/enroll", {
  chain_id: CHAIN_ID,
  address: wallet.address,
  typed_data: payload.typed_data,
  mac: payload.mac,
  signature,
  pop_signature: popSignature,
});

const token = enrolled.json?.api_key?.api_key || enrolled.json?.api_key;
console.log("enroll", enrolled.status, token ? "token_received" : JSON.stringify(enrolled.json).slice(0, 300));
if (!token || typeof token !== "string") process.exit(3);

const secretHex = Buffer.from(privateKey).toString("hex");
upsert(envPath, {
  PERPL_ENABLED: "false",
  PERPL_API_URL: API,
  PERPL_WS_URL: "wss://testnet.perpl.xyz",
  PERPL_CHAIN_ID: String(CHAIN_ID),
  PERPL_API_KEY: token,
  PERPL_PRIVATE_KEY: secretHex,
  PERPL_ACCOUNT_ID: "0",
  PERP_MARKET_ID: "64",
  PERP_PRICE_DECIMALS: "5",
  PERP_SIZE_DECIMALS: "0",
});

async function signedGet(target) {
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("base64url");
  const bodyHash = createHash("sha256").update("").digest("hex");
  const canonical = [CHAIN_ID, "GET", target, timestamp, nonce, bodyHash].join("\n");
  const sig = await ed.signAsync(Buffer.from(canonical), privateKey);
  const res = await fetch(`${API}${target}`, {
    headers: {
      "X-API-Key": token,
      "X-API-Timestamp": timestamp,
      "X-API-Nonce": nonce,
      "X-API-Signature": Buffer.from(sig).toString("base64url"),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 240) };
}

const fills = await signedGet("/v1/trading/fills?count=1");
console.log("fills", fills.status, fills.body.replace(token, "[redacted]"));
console.log("WALLET", wallet.address);
console.log("ORIGIN", originUsed);
console.log("ENV_UPDATED", envPath);
