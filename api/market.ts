/**
 * API de cotações — dólar (AwesomeAPI + fallback Binance) e commodities (HTML com User-Agent).
 */

type MarketItem = {
  name: string;
  value: number | null;
  change: number | null;
};

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

async function fetchUsdAwesome(): Promise<MarketItem | null> {
  const res = await fetch(
    "https://economia.awesomeapi.com.br/json/last/USD-BRL",
    {
      headers: { Accept: "application/json" },
    }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, Record<string, string>>;
  const d = json?.USDBRL;
  if (!d) return null;
  const value = parseNum(d.bid ?? d.ask);
  const change = parseNum(d.pctChange ?? d.varBid);
  return {
    name: "💵 Dólar",
    value,
    change,
  };
}

async function fetchUsdBinance(): Promise<MarketItem | null> {
  const res = await fetch(
    "https://api.binance.com/api/v3/ticker/24hr?symbol=USDTBRL"
  );
  if (!res.ok) return null;
  const j = (await res.json()) as {
    lastPrice?: string;
    priceChangePercent?: string;
  };
  const value = parseNum(j.lastPrice);
  const change = parseNum(j.priceChangePercent);
  return {
    name: "💵 Dólar",
    value,
    change,
  };
}

async function fetchUsd(): Promise<MarketItem> {
  const a = await fetchUsdAwesome();
  if (a && a.value != null) return a;
  const b = await fetchUsdBinance();
  if (b && b.value != null) return b;
  return { name: "💵 Dólar", value: null, change: null };
}

function extractCommodity(html: string, labels: string[]): number | null {
  const flat = html.replace(/\s+/g, " ");
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`${escaped}[^\\d]{0,120}?(\\d{1,3}[\\.,]\\d{2,4})`, "i"),
      new RegExp(`${escaped}[^\\d]{0,300}?(\\d{1,2}[\\.,]\\d{4})`, "i"),
    ];
    for (const re of patterns) {
      const m = flat.match(re);
      if (m?.[1]) {
        let raw = m[1];
        if (raw.includes(".") && raw.includes(",")) {
          raw = raw.replace(/\./g, "").replace(",", ".");
        } else {
          raw = raw.replace(",", ".");
        }
        const n = parseFloat(raw);
        if (Number.isFinite(n) && n > 0 && n < 1_000_000) return n;
      }
    }
  }
  return null;
}

async function fetchCommodityPage(): Promise<string> {
  const res = await fetch("https://www.noticiasagricolas.com.br/cotacoes", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`cotacoes HTTP ${res.status}`);
  return res.text();
}

export default async function handler(req: { method?: string }, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const usdItem = await fetchUsd();

    let html = "";
    try {
      html = await fetchCommodityPage();
    } catch {
      html = "";
    }

    const agro =
      html.length > 500
        ? [
            {
              name: "🌱 Soja",
              value: extractCommodity(html, ["Soja", "soja"]),
              change: null as number | null,
            },
            {
              name: "🌽 Milho",
              value: extractCommodity(html, ["Milho", "milho"]),
              change: null as number | null,
            },
            {
              name: "🍬 Açúcar",
              value: extractCommodity(html, ["Açúcar", "Acucar", "açúcar"]),
              change: null as number | null,
            },
          ]
        : [
            { name: "🌱 Soja", value: null, change: null },
            { name: "🌽 Milho", value: null, change: null },
            { name: "🍬 Açúcar", value: null, change: null },
          ];

    const items: MarketItem[] = [usdItem, ...agro];
    const body = {
      items,
      savedAt: new Date().toISOString(),
    };

    return res.status(200).json(body);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao buscar cotações";
    return res.status(500).json({ error: msg });
  }
}
