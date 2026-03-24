import { useEffect, useState } from "react";

type MarketItem = {
  name: string;
  value: number | null;
  change: number | null;
};

const STORAGE_KEY = "market-last-quote";

function parseStored(): { items: MarketItem[]; savedAt?: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as { items?: unknown; savedAt?: string };
    if (!j?.items || !Array.isArray(j.items)) return null;
    return { items: j.items as MarketItem[], savedAt: j.savedAt };
  } catch {
    return null;
  }
}

function saveStored(items: MarketItem[], savedAt?: string) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items, savedAt: savedAt ?? new Date().toISOString() })
    );
  } catch {
    /* quota / private mode */
  }
}

function normalizeMarketJson(json: unknown): MarketItem[] | null {
  if (Array.isArray(json)) return json as MarketItem[];
  if (
    json &&
    typeof json === "object" &&
    "items" in json &&
    Array.isArray((json as { items: unknown }).items)
  ) {
    return (json as { items: MarketItem[] }).items;
  }
  return null;
}

function mergeWithPrevious(
  current: MarketItem[],
  previous: MarketItem[] | null
): MarketItem[] {
  if (!previous?.length) return current;
  return current.map((item, i) => {
    const prev = previous[i];
    if (!prev) return item;
    return {
      ...item,
      value: item.value != null ? item.value : prev.value,
      change:
        item.change != null ? item.change : prev.change != null ? prev.change : null,
    };
  });
}

export function MarketTicker() {
  const [data, setData] = useState<MarketItem[]>([]);

  async function loadFallbackData() {
    try {
      const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
      const json = await res.json();
      const dollar = json?.USDBRL || {};
      const dollarValue = Number(dollar.bid);
      const dollarChange = Number(dollar.pctChange);

      const items: MarketItem[] = [
        {
          name: "💵 Dólar",
          value: Number.isFinite(dollarValue) ? dollarValue : null,
          change: Number.isFinite(dollarChange) ? dollarChange : null,
        },
        { name: "🌱 Soja", value: null, change: null },
        { name: "🌽 Milho", value: null, change: null },
        { name: "🍬 Açúcar", value: null, change: null },
      ];
      setData(items);
      saveStored(items);
    } catch (err) {
      console.error("Erro no fallback de cotacoes:", err);
    }
  }

  async function loadData() {
    try {
      const res = await fetch("/api/market");

      if (!res.ok) {
        throw new Error("Falha ao buscar cotacoes");
      }

      const json = await res.json();
      const rawItems = normalizeMarketJson(json);
      if (!rawItems) {
        throw new Error("Resposta invalida da API de cotacoes");
      }

      const savedAt =
        json &&
        typeof json === "object" &&
        "savedAt" in json &&
        typeof (json as { savedAt: unknown }).savedAt === "string"
          ? (json as { savedAt: string }).savedAt
          : undefined;

      const prev = parseStored()?.items ?? null;
      const merged = mergeWithPrevious(rawItems, prev);
      setData(merged);
      saveStored(merged, savedAt);
    } catch (err) {
      console.error("Erro ao carregar cotacoes:", err);
      const cached = parseStored();
      if (cached?.items?.length) {
        setData(cached.items);
      } else {
        await loadFallbackData();
      }
    }
  }

  useEffect(() => {
    const cached = parseStored();
    if (cached?.items?.length) {
      setData(cached.items);
    }
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full overflow-hidden border-y border-zinc-800 bg-black rounded-lg sm:rounded-none">
      <div className="flex whitespace-nowrap animate-marquee py-2.5 sm:py-2 text-xs sm:text-sm">
        {[...data, ...data].map((item, i) => (
          <div
            key={i}
            className="mx-4 sm:mx-8 flex items-center gap-2 sm:gap-3 shrink-0"
          >
            <span className="text-zinc-400">{item.name}</span>

            <span className="text-white font-semibold tabular-nums">
              {typeof item.value === "number"
                ? item.value.toFixed(2)
                : "--"}
            </span>

            {item.change != null ? (
              <span
                className={`font-semibold ${
                  item.change >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {item.change >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(item.change).toFixed(2)}%
              </span>
            ) : (
              <span className="text-zinc-600 font-medium">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
