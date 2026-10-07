/** Verified Monad testnet Kuru txs — not Perpl, not simulation fills. */
export const KURU_TESTNET_EVIDENCE = [
  {
    label: "Margin deposit (MON)",
    labelZh: "保证金充值 · MON",
    hash: "0xabc80272d0e4ad917379d6cbddf53495c6cb0cb139dc342235023c811a4eae37",
    url: "https://testnet.monadscan.com/tx/0xabc80272d0e4ad917379d6cbddf53495c6cb0cb139dc342235023c811a4eae37",
  },
  {
    label: "Margin deposit (MTX)",
    labelZh: "保证金充值 · MTX",
    hash: "0x589fd98dd556bc94d24cea967e877b7f1cd1327bb30a445ee7530f166a3489f8",
    url: "https://testnet.monadscan.com/tx/0x589fd98dd556bc94d24cea967e877b7f1cd1327bb30a445ee7530f166a3489f8",
  },
  {
    label: "GTC post-only sell",
    labelZh: "GTC 挂单卖出",
    hash: "0x25526fd1821f11034ef1c71c45f0df502f12d658bb39ae409ba444aa03f87664",
    url: "https://testnet.monadscan.com/tx/0x25526fd1821f11034ef1c71c45f0df502f12d658bb39ae409ba444aa03f87664",
  },
  {
    label: "IOC margin sell",
    labelZh: "IOC 保证金卖出",
    hash: "0x4338b7ffc13bdea0d2846e84a173284fdd3679a69dcf67a7b286ca1c6c3f9591",
    url: "https://testnet.monadscan.com/tx/0x4338b7ffc13bdea0d2846e84a173284fdd3679a69dcf67a7b286ca1c6c3f9591",
  },
  {
    label: "Earlier deposit",
    labelZh: "更早充值证据",
    hash: "0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55",
    url: "https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55",
  },
  {
    label: "Earlier IOC sell",
    labelZh: "更早 IOC 卖出",
    hash: "0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7",
    url: "https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7",
  },
] as const;

const ORDERBOOK = "0x9a380069AB25F95d81D6A0F5fD5c99B08aBe975c";
const AGENT_WALLET = "0x56deA58769d57851D2372A4987C7EBD3a5F5C1E6";

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function KuruEvidence({ compact = false }: { compact?: boolean }) {
  const shown = compact ? KURU_TESTNET_EVIDENCE.slice(0, 4) : KURU_TESTNET_EVIDENCE;
  return (
    <div className="card kuru-evidence">
      <div className="row" style={{ marginBottom: compact ? 6 : 10 }}>
        <span className="badge ok">
          Kuru proofs · {KURU_TESTNET_EVIDENCE.length} verified
        </span>
        <span className="muted small">Monad testnet · not Perpl · not SIM fills</span>
      </div>
      {!compact && (
        <p className="muted small" style={{ margin: "0 0 10px" }}>
          Spot execution routes through Kuru&apos;s onchain CLOB. Judges: open each MonadScan
          link — real margin deposits, GTC, and IOC sells. Simulation badges in the decision
          stream are separate.
        </p>
      )}
      <ul className="evidence-list">
        {shown.map((tx) => (
          <li key={tx.hash}>
            <span className="evidence-label">
              {tx.label}
              <span className="muted small"> · {tx.labelZh}</span>
            </span>
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
      {compact && KURU_TESTNET_EVIDENCE.length > shown.length && (
        <p className="muted small" style={{ marginTop: 8 }}>
          +{KURU_TESTNET_EVIDENCE.length - shown.length} more proofs on Home
        </p>
      )}
      <div className="evidence-meta muted small">
        <a
          className="tx onchain"
          href={`https://testnet.monadscan.com/address/${ORDERBOOK}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Orderbook {shortHash(ORDERBOOK)} ↗
        </a>
        <a
          className="tx onchain"
          href={`https://testnet.monadscan.com/address/${AGENT_WALLET}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Agent wallet {shortHash(AGENT_WALLET)} ↗
        </a>
      </div>
    </div>
  );
}
