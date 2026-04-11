/**
 * Parsing e busca de cotações reutilizáveis no cliente (fallback quando /api/market falha).
 */

export type MarketItem = {
  name: string;
  value: number | null;
  change: number | null;
};

export function parseMarketNumber(v: unknown): number | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function mergeMarketRows(
  current: MarketItem[],
  previous: MarketItem[] | null
): MarketItem[] {
  if (!previous?.length) return current;
  const prevByName = new Map(previous.map((it) => [it.name, it]));
  return current.map((item) => {
    const prev = prevByName.get(item.name);
    if (!prev) return item;
    return {
      ...item,
      value: item.value != null ? item.value : prev.value,
      change:
        item.change != null
          ? item.change
          : prev.change != null
            ? prev.change
            : null,
    };
  });
}

function withAgroShell(usd: MarketItem): MarketItem[] {
  return [
    usd,
    { name: "🌱 Soja", value: null, change: null },
    { name: "🌽 Milho", value: null, change: null },
    { name: "🍬 Açúcar", value: null, change: null },
  ];
}

export async function fetchUsdAwesomeClient(signal?: AbortSignal): Promise<MarketItem | null> {
  const res = await fetch(
    "https://economia.awesomeapi.com.br/json/last/USD-BRL",
    {
      headers: { Accept: "application/json" },
      signal,
    }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, Record<string, string>>;
  const d = json?.USDBRL;
  if (!d) return null;
  const value = parseMarketNumber(d.bid ?? d.ask);
  const change = parseMarketNumber(d.pctChange ?? d.varBid);
  return {
    name: "💵 Dólar",
    value,
    change,
  };
}

export async function fetchUsdBinanceClient(signal?: AbortSignal): Promise<MarketItem | null> {
  const res = await fetch(
    "https://api.binance.com/api/v3/ticker/24hr?symbol=USDTBRL",
    { signal }
  );
  if (!res.ok) return null;
  const j = (await res.json()) as {
    lastPrice?: string;
    priceChangePercent?: string;
  };
  const value = parseMarketNumber(j.lastPrice);
  const change = parseMarketNumber(j.priceChangePercent);
  return {
    name: "💵 Dólar",
    value,
    change,
  };
}

/** Monta as 4 linhas do ticker só com dólar em tempo real; demais vêm do merge com cache. */
export async function buildClientFallbackItems(
  previous: MarketItem[] | null,
  signal?: AbortSignal
): Promise<MarketItem[]> {
  let usd: MarketItem = { name: "💵 Dólar", value: null, change: null };
  try {
    const a = await fetchUsdAwesomeClient(signal);
    if (a && a.value != null) usd = a;
    else {
      const b = await fetchUsdBinanceClient(signal);
      if (b && b.value != null) usd = b;
    }
  } catch {
    /* rede / CORS / abort */
  }
  const shell = withAgroShell(usd);
  return mergeMarketRows(shell, previous);
}

export function normalizeMarketApiPayload(json: unknown): {
  items: MarketItem[];
  savedAt?: string;
  stale?: boolean;
} | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (!Array.isArray(o.items)) return null;
  const items = o.items as MarketItem[];
  if (items.length === 0) return null;
  return {
    items,
    savedAt: typeof o.savedAt === "string" ? o.savedAt : undefined,
    stale: o.stale === true,
  };
}
