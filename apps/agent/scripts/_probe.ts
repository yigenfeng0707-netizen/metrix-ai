// 临时探针6：检查新市场日志与 MTX 余额（用后即删）
import "dotenv/config";
import { ethers } from "ethers";

const p = new ethers.providers.JsonRpcProvider(process.env.KURU_RPC_URL);

async function main() {
  const latest = await p.getBlockNumber();
  const logs = await p.getLogs({
    address: "0x9a380069AB25F95d81D6A0F5fD5c99B08aBe975c",
    fromBlock: latest - 90,
    toBlock: "latest",
  });
  console.log("market logs (200 blocks):", logs.length);
  const transfer = ethers.utils.id("Transfer(address,address,uint256)");
  for (const l of logs.slice(-10)) {
    const isT = l.topics[0] === transfer;
    console.log(l.blockNumber, l.topics[0].slice(0, 10), isT ? "Transfer" : "", l.data.slice(0, 20));
  }
  const bal = await p.call({
    to: "0x152C774D6AF4ab78e3a58dd917Cf8343BdE6fA82",
    data: "0x70a0823100000000000000000000000056deA58769d57851D2372A4987C7EBD3a5F5C1E6",
  });
  console.log("wallet MTX:", ethers.BigNumber.from(bal).toString());
}
main().catch(e => { console.error("ERR", e?.message ?? e); process.exit(1); });
