/**
 * 创建专用演示钱包（W1 用）
 *
 * 用法：
 *   npx tsx scripts/create-demo-wallet.ts            # 生成新钱包，打印地址与私钥
 *   npx tsx scripts/create-demo-wallet.ts --save-env # 同时写入本目录 .env（KURU_PRIVATE_KEY / 演示地址）
 *
 * 安全须知：
 *   - 该钱包仅用于黑客松小额演示，正式资金请勿存放
 *   - .env 已被 .gitignore 排除，私钥不会进入 git 历史
 */
import { ethers } from "ethers";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 支持导入已有私钥：--pk 0x…（不传则生成新钱包）
const pkArgIdx = process.argv.indexOf("--pk");
const wallet = pkArgIdx > -1 ? new ethers.Wallet(process.argv[pkArgIdx + 1]) : ethers.Wallet.createRandom();
const addr = wallet.address;
const pk = wallet.privateKey;

console.log("=== Metrix AI 演示钱包 ===");
console.log("Address    :", addr);
console.log("Private key:", pk);
if (!pkArgIdx) console.log("Mnemonic   :", wallet.mnemonic?.phrase ?? "(random)");

if (process.argv.includes("--save-env")) {
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));
  let content = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";
  const upsert = (key: string, value: string) => {
    const re = new RegExp(`^${key}=.*$`, "m");
    content = re.test(content) ? content.replace(re, `${key}=${value}`) : content + `\n${key}=${value}`;
  };
  upsert("KURU_PRIVATE_KEY", pk);
  if (!content.includes("KURU_RPC_URL=") || content.includes("KURU_RPC_URL=\r")) {
    upsert("KURU_RPC_URL", "https://rpc.monad.xyz");
  }
  writeFileSync(envPath, content, "utf-8");
  console.log("\n✓ 已写入 .env（KURU_PRIVATE_KEY 已设置；RPC 使用 Monad 主网公共节点）");
  console.log("→ 下一步：向该地址转入小额 MON（建议 $20-50 等值）作为演示资金");
}
