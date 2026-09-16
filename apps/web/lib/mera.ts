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
const ADDR_KEY = "metrix.mera.address";

export interface StoredCredential {
  credentialId: string;
  transports?: readonly string[];
}

/** 派生地址持久化（刷新页面后直接展示，无需重复 PRF 弹窗） */
export function saveMeraAddress(address: string): void {
  localStorage.setItem(ADDR_KEY, address);
}
export function loadMeraAddress(): string | null {
  return localStorage.getItem(ADDR_KEY);
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
export async function meraCreateAccount(
  displayName: string,
): Promise<{ address: string; privateKey: `0x${string}` }> {
  const created = await createPasskeyWithPrfOutput({
    rp: { id: location.hostname, name: "Metrix AI" },
    user: { name: displayName, displayName },
  });
  saveStored({ credentialId: created.credentialId, transports: created.transports });
  return keyFromPrf(created.prfOutput);
}

/** 登录：用已保存的 credentialId 弹出 passkey 验证，重新派生同一账户 */
export async function meraLogin(): Promise<{ address: string; privateKey: `0x${string}` }> {
  const stored = loadStored();
  const { prfOutput, credentialId } = await getPasskeyPrfOutput({
    rpId: location.hostname,
    credential: stored,
  });
  saveStored({
    credentialId: stored?.credentialId ?? credentialId,
    transports: stored?.transports,
  });
  return keyFromPrf(prfOutput);
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

async function keyFromPrf(prfOutput: Uint8Array): Promise<{
  address: string;
  privateKey: `0x${string}`;
}> {
  const privateKey = deriveEvmPrivateKey(prfOutput);
  const { privateKeyToAccount } = await import("viem/accounts");
  const { bytesToHex } = await import("viem");
  const account = privateKeyToAccount(bytesToHex(privateKey));
  return { address: account.address, privateKey: bytesToHex(privateKey) as `0x${string}` };
}

// ---------- Monad 主网：余额查询 + 转账（D3 资金流） ----------
export const AUSD_ADDRESS = "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a" as const;
const AUSD_DECIMALS = 6;
const MONAD_MAINNET = {
  id: 143,
  name: "monad",
  network: "monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
} as const;

async function mainnetClient() {
  const { createPublicClient, http } = await import("viem");
  return createPublicClient({ chain: MONAD_MAINNET, transport: http("https://rpc.monad.xyz") });
}

async function walletClient(privateKey: `0x${string}`) {
  const { createWalletClient, http } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  return createWalletClient({
    chain: MONAD_MAINNET,
    transport: http("https://rpc.monad.xyz"),
    account: privateKeyToAccount(privateKey),
  });
}

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

/** 查询 AUSD 余额（Monad 主网；测试网无 AUSD） */
export async function getAusdBalance(address: string): Promise<number> {
  const { formatUnits } = await import("viem");
  const client = await mainnetClient();
  const raw = (await client.readContract({
    address: AUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  })) as bigint;
  return Number(formatUnits(raw, AUSD_DECIMALS));
}

/** 查询 MON 余额（主网） */
export async function getMonBalance(address: string): Promise<number> {
  const { formatEther } = await import("viem");
  const client = await mainnetClient();
  const raw = await client.getBalance({ address: address as `0x${string}` });
  return Number(formatEther(raw));
}

/**
 * 从 passkey 派生账户转出原生 MON。
 * ⚠ Monad 规则：按"声明 gasLimit"收费——必须显式传 gas，不能依赖估算（官方文档明示）。
 */
export async function sendMonTransfer(
  privateKey: `0x${string}`,
  to: string,
  amountMon: number,
): Promise<string> {
  const { parseEther } = await import("viem");
  const client = await walletClient(privateKey);
  const hash = await client.sendTransaction({
    to: to as `0x${string}`,
    value: parseEther(String(amountMon)),
    gas: 21_000n, // 标准 MON 转账固定 gas
  });
  return hash;
}

/** 从 passkey 派生账户转出 AUSD（ERC-20 transfer，显式 gas） */
export async function sendAusdTransfer(
  privateKey: `0x${string}`,
  to: string,
  amountAusd: number,
): Promise<string> {
  const { parseUnits } = await import("viem");
  const client = await walletClient(privateKey);
  const hash = await client.writeContract({
    address: AUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to as `0x${string}`, parseUnits(String(amountAusd), AUSD_DECIMALS)],
    gas: 80_000n, // ERC-20 transfer 显式 gas（Monad 按声明收费）
  });
  return hash;
}
