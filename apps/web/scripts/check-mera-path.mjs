import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

const prf = new Uint8Array(32).fill(7);
const seed = mnemonicToSeedSync(entropyToMnemonic(prf, wordlist));
const wrong = HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0'");
const right = HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0/0");
const hex = (k) => Buffer.from(k.privateKey).toString("hex").slice(0, 16);
console.log("wrong", hex(wrong));
console.log("right", hex(right));
console.log("same?", Buffer.from(wrong.privateKey).equals(Buffer.from(right.privateKey)));
