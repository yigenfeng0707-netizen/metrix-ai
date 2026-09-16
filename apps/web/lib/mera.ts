// Mera passkey 认证层（docs.monad.xyz/guides/mera）
// 从用户 passkey（Face ID / Windows Hello / 密码管理器）PRF 派生标准 EOA，
// 无需合约部署、无需 bundler。账户完全由用户掌控。
"use client";

import {
  createPasskeyWithPrfOutput,
  getPasskeyPrfOutput,
  isMeraError,
} from "@category-labs/mera";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

const CRED_KEY = "metrix.mera.credential";

export interface StoredCredential {
  credentialId: string;
  transports?: readonly string[];
}

function loadStored(): StoredCredential | undefined {
  try {
    const raw = localStorage.getItem(CRED_KEY);
    return raw ? (JSON.parse(raw) as StoredCredential) : undefined;
  } catch {
    return undefined;
  }
}

function saveStored(c: StoredCredential): void {
  localStorage.setItem(CRED_KEY, JSON.stringify(c));
}

/** PRF 输出 → BIP-39 助记词 → BIP-44 派生 EVM 私钥（index 可派生多账户） */
function deriveEvmPrivateKey(prfOutput: Uint8Array, index = 0): Uint8Array {
  const seed = mnemonicToSeedSync(entropyToMnemonic(prfOutput, wordlist));
  const node = HDKey.fromMasterSeed(seed).derive("m/44'/60'/" + 0 + "'/" + index + "'");
  if (node.privateKey === null) throw new Error("derivation produced no key");
  return node.privateKey;
}

/** 注册：创建新 passkey 并派生账户（仅在用户没有 passkey 时调用一次） */
export async function meraCreateAccount(displayName: string): Promise<{ address: string }> {
  const created = await createPasskeyWithPrfOutput({
    rp: { id: location.hostname, name: "Metrix AI" },
    user: { name: displayName, displayName },
  });
  saveStored({ credentialId: created.credentialId, transports: created.transports });
  return addressFromPrf(created.prfOutput);
}

/** 登录：用已保存的 credentialId 弹出 passkey 验证，重新派生同一账户 */
export async function meraLogin(): Promise<{ address: string }> {
  const stored = loadStored();
  const { prfOutput, credentialId } = await getPasskeyPrfOutput({
    rpId: location.hostname,
    credential: stored,
  });
  saveStored({
    credentialId: stored?.credentialId ?? credentialId,
    transports: stored?.transports,
  });
  return addressFromPrf(prfOutput);
}

/** 检查本机是否已有已绑定的 passkey */
export function hasMeraCredential(): boolean {
  return loadStored() !== undefined;
}

export function meraErrorHint(e: unknown): string {
  if (isMeraError(e)) {
    switch (e.code) {
      case "PRF_UNAVAILABLE":
        return "当前 passkey 提供商不支持 PRF 扩展（桌面 Chrome 请把 passkey 保存到 Google 密码管理器）";
      case "PASSKEY_OPERATION_FAILED":
        return "passkey 操作失败或被取消，请重试";
      case "CRYPTO_UNAVAILABLE":
        return "需要 HTTPS 安全上下文";
      case "SESSION_ENDED":
        return "签名会话已结束";
    }
  }
  return e instanceof Error ? e.message : String(e);
}

async function addressFromPrf(prfOutput: Uint8Array): Promise<{ address: string }> {
  const privateKey = deriveEvmPrivateKey(prfOutput);
  const { privateKeyToAccount } = await import("viem/accounts");
  const { bytesToHex } = await import("viem");
  const account = privateKeyToAccount(bytesToHex(privateKey));
  return { address: account.address };
}

// ---------- AUSD（Monad 主网官方稳定币，Kuru 合约文档确认） ----------
export const AUSD_ADDRESS = "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a" as const;
const AUSD_DECIMALS = 6;

/** 查询 AUSD 余额（Monad 主网；测试网无 AUSD） */
export async function getAusdBalance(address: string): Promise<number> {
  const { createPublicClient, http, erc20Abi, formatUnits } = await import("viem");
  const client = createPublicClient({
    chain: {
      id: 143,
      name: "monad",
      network: "monad",
      nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
      rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
    },
    transport: http("https://rpc.monad.xyz"),
  });
  const raw = (await client.readContract({
    address: AUSD_ADDRESS,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  })) as bigint;
  return Number(formatUnits(raw, AUSD_DECIMALS));
}
