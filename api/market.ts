/**
 * API de cotações — dólar (AwesomeAPI + fallback Binance) e commodities (HTML com User-Agent).
 */

type MarketItem = {
  name: string;
  value: number | null;
  change: number | null;
};

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = 12000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseLocaleNumber(v: unknown): number | null {
  if (v == null) return null;
  let raw = String(v).trim();
  if (!raw) return null;
  raw = raw.replace(/[^\d,.-]/g, "");
  if (!raw) return null;

  if (raw.includes(".") && raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else {
    raw = raw.replace(",", ".");
  }
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

async function fetchUsdAwesome(): Promise<MarketItem | null> {
  const res = await fetchWithTimeout(
    "https://economia.awesomeapi.com.br/json/last/USD-BRL",
    {
      headers: { Accept: "application/json" },
    },
    12000
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
  const res = await fetchWithTimeout(
    "https://api.binance.com/api/v3/ticker/24hr?symbol=USDTBRL",
    undefined,
    12000
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
  try {
    const a = await fetchUsdAwesome();
    if (a && a.value != null) return a;
  } catch {
    // Fallback na Binance abaixo.
  }
  try {
    const b = await fetchUsdBinance();
    if (b && b.value != null) return b;
  } catch {
    // Continua para retorno nulo padronizado.
  }
  return { name: "💵 Dólar", value: null, change: null };
}

function extractSectionValue(
  html: string,
  sectionLabel: string
): { value: number | null; change: number | null } {
  const escaped = sectionLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionRegex = new RegExp(
    `<h2>[^<]*${escaped}[^<]*<\\/h2>[\\s\\S]{0,8000}?<tbody>[\\s\\S]{0,5000}?<tr[^>]*>[\\s\\S]{0,1200}?<td[^>]*>[^<]*<\\/td>[\\s\\S]{0,1200}?<td[^>]*>([^<]+)<\\/td>(?:[\\s\\S]{0,1200}?<td[^>]*>([^<]+)<\\/td>)?`,
    "i"
  );
  const match = html.match(sectionRegex);
  if (!match) return { value: null, change: null };

  const value = parseLocaleNumber(match[1]);
  const change = parseLocaleNumber(match[2] ?? null);
  return { value, change };
}

async function fetchCommodityPage(): Promise<string> {
  const res = await fetchWithTimeout(
    "https://www.noticiasagricolas.com.br/cotacoes",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    },
    18000
  );
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

    const soja = html.length > 500 ? extractSectionValue(html, "Soja") : null;
    const milho = html.length > 500 ? extractSectionValue(html, "Milho") : null;
    const acucar =
      html.length > 500 ? extractSectionValue(html, "Açúcar") : null;

    const agro = [
      {
        name: "🌱 Soja",
        value: soja?.value ?? null,
        change: soja?.change ?? null,
      },
      {
        name: "🌽 Milho",
        value: milho?.value ?? null,
        change: milho?.change ?? null,
      },
      {
        name: "🍬 Açúcar",
        value: acucar?.value ?? null,
        change: acucar?.change ?? null,
      },
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
