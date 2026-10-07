import { config } from "../config";

/**
 * Perpl 公开行情（无需 API Key）—— 供 Analytics / Risk 看板与就绪检查使用。
 */

export interface PerplMarketBrief {
  id: number;
  name: string;
  priceDecimals?: number;
  sizeDecimals?: number;
}

export interface PerplPublicStatus {
  ok: boolean;
  network: "mainnet" | "testnet" | "custom";
  apiUrl: string;
  chainId: number;
  markets: PerplMarketBrief[];
  selectedMarket: PerplMarketBrief | null;
  lastCandle?: { t: number; c: number; v: string };
  error?: string;
  fetchedAt: number;
}

function networkLabel(chainId: number): PerplPublicStatus["network"] {
  if (chainId === 143) return "mainnet";
  if (chainId === 10143) return "testnet";
  return "custom";
}

export async function fetchPerplPublicStatus(): Promise<PerplPublicStatus> {
  const apiUrl = config.perpl.apiUrl;
  const chainId = config.perpl.chainId;
  const base: PerplPublicStatus = {
    ok: false,
    network: networkLabel(chainId),
    apiUrl,
    chainId,
    markets: [],
    selectedMarket: null,
    fetchedAt: Date.now(),
  };
  try {
    const r = await fetch(`${apiUrl}/v1/pub/context`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) {
      return { ...base, error: `context HTTP ${r.status}` };
    }
    const ctx = (await r.json()) as {
      markets?: Array<{ id: number; name?: string; price_decimals?: number; size_decimals?: number }>;
    };
    const markets = (ctx.markets ?? []).map((m) => ({
      id: m.id,
      name: m.name ?? `Market ${m.id}`,
      priceDecimals: m.price_decimals,
      sizeDecimals: m.size_decimals,
    }));
    const selected =
      markets.find((m) => m.id === config.perpl.marketId) ?? markets[0] ?? null;

    let lastCandle: PerplPublicStatus["lastCandle"];
    if (selected) {
      const to = Date.now();
      const from = to - 60 * 60 * 1000;
      const url = `${apiUrl}/v1/market-data/${selected.id}/candles/60/${from}-${to}`;
      const cr = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (cr.ok) {
        const data = (await cr.json()) as { d?: Array<{ t: number; c: number; v: string }> };
        const candles = data.d ?? [];
        if (candles.length) lastCandle = candles[candles.length - 1];
      }
    }

    return {
      ...base,
      ok: true,
      markets: markets.slice(0, 12),
      selectedMarket: selected,
      lastCandle,
    };
  } catch (err) {
    return { ...base, error: (err as Error).message };
  }
}
