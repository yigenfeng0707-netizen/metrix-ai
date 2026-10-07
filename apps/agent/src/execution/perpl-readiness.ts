import { config } from "../config";
import { fetchPerplPublicStatus } from "../market/perpl-public";

export interface PerplReadiness {
  enabled: boolean;
  hasApiKey: boolean;
  hasPrivateKey: boolean;
  hasAccountId: boolean;
  publicOk: boolean;
  liveTradeReady: boolean;
  blockers: string[];
  nextSteps: string[];
  public: Awaited<ReturnType<typeof fetchPerplPublicStatus>>;
  note: string;
}

/**
 * Agora / Perpl 真成交就绪检查（不泄露密钥内容）。
 */
export async function getPerplReadiness(): Promise<PerplReadiness> {
  const pub = await fetchPerplPublicStatus();
  const hasApiKey = Boolean(config.perpl.apiKey);
  const hasPrivateKey = Boolean(config.perpl.privateKey);
  const hasAccountId = config.perpl.accountId > 0;
  const blockers: string[] = [];
  const nextSteps: string[] = [];

  if (!pub.ok) blockers.push(`Public API unreachable: ${pub.error ?? "unknown"}`);
  if (!hasApiKey || !hasPrivateKey) {
    blockers.push("Missing PERPL_API_KEY / PERPL_PRIVATE_KEY (or PERPL_API_KEY_SECRET)");
    nextSteps.push(
      "1) Fund agent wallet with ≥100 aUSD collateral on the target Perpl network",
      "2) Open https://testnet.perpl.xyz (or app.perpl.xyz) → connect wallet → create profile",
      "3) Run: node scripts/perpl-enroll-testnet.mjs  (writes keys into apps/agent/.env only)",
    );
  }
  if (!hasAccountId) {
    blockers.push("PERPL_ACCOUNT_ID is 0 — on-chain createAccount() not completed");
    nextSteps.push(
      "4) Call Exchange.createAccount(amountCNS) with initial collateral (see docs/agora-perpl-live-path.md)",
      "5) Set PERPL_ACCOUNT_ID from the returned account id, then PERPL_ENABLED=true",
    );
  }
  if (!config.perpl.enabled) {
    blockers.push("PERPL_ENABLED is not true");
    nextSteps.push("6) Set PERPL_ENABLED=true and restart agent; or run scripts/perpl-place-ioc.mjs");
  }
  if (hasApiKey && hasPrivateKey && hasAccountId && config.perpl.enabled && pub.ok) {
    nextSteps.push("Keys present — place a tiny IOC via scripts/perpl-place-ioc.mjs and record the fill id / rq");
  }

  const liveTradeReady =
    config.perpl.enabled && hasApiKey && hasPrivateKey && hasAccountId && pub.ok;

  return {
    enabled: config.perpl.enabled,
    hasApiKey,
    hasPrivateKey,
    hasAccountId,
    publicOk: pub.ok,
    liveTradeReady,
    blockers,
    nextSteps: [...new Set(nextSteps)],
    public: pub,
    note: liveTradeReady
      ? "Config looks ready for a live Perpl IOC; user/wallet confirmation may still be required for createAccount."
      : "Live Perpl fill not ready — do not claim Agora passkey+AUSD+Perpl trade until a fill is verified.",
  };
}
