import type { AgentMode, QuoteSource } from "@metrix/shared";

export default function ModeBanner({
  mode,
  quoteSource,
}: {
  mode: AgentMode;
  quoteSource?: QuoteSource;
}) {
  if (mode === "sim") {
    return (
      <p className="subtitle">
        Live decision stream may show{" "}
        <span className="badge sim">Simulation</span> fills for safe demo loops.{" "}
        <b>Kuru proofs above are real on-chain txs</b> — open MonadScan. Perpl fills are not
        claimed.
      </p>
    );
  }
  const quote =
    quoteSource === "kuru_amm"
      ? "Quotes: AMM implied (L2 empty — honest fallback)."
      : quoteSource === "kuru_l2"
        ? "Quotes: Kuru L2."
        : "";
  return (
    <p className="subtitle">
      <span className="badge ok">{mode === "live" ? "LIVE" : "TESTNET"}</span>{" "}
      {mode === "live" ? "Real orders — check size & keys." : "Kuru testnet path active."}{" "}
      {quote} Perpl stays off until a fill is verified.
    </p>
  );
}
