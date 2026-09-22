/** Verified Monad testnet Kuru txs — not Perpl, not simulation fills. */
export const KURU_TESTNET_EVIDENCE = [
  {
    label: "保证金充值",
    hash: "0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55",
    url: "https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55",
  },
  {
    label: "IOC 保证金卖出",
    hash: "0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7",
    url: "https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7",
  },
] as const;

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function KuruEvidence({ compact = false }: { compact?: boolean }) {
  return (
    <div className="card kuru-evidence">
      <div className="row" style={{ marginBottom: compact ? 6 : 10 }}>
        <span className="badge ok">Kuru · Monad testnet</span>
        <span className="muted small">已验证链上证据（不是 Perpl，也不是本页 SIM 成交）</span>
      </div>
      <ul className="evidence-list">
        {KURU_TESTNET_EVIDENCE.map((tx) => (
          <li key={tx.hash}>
            <span className="evidence-label">{tx.label}</span>
            <a
              className="tx onchain mono"
              href={tx.url}
              target="_blank"
              rel="noopener noreferrer"
              title={tx.hash}
            >
              {shortHash(tx.hash)} ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
