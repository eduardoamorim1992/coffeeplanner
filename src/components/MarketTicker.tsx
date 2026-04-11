import { useEffect, useRef, useState } from "react";
import {
  buildClientFallbackItems,
  mergeMarketRows,
  normalizeMarketApiPayload,
  type MarketItem,
} from "@/lib/marketQuotes";

const STORAGE_KEY = "market-last-quote-v2";

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

async function safeParseMarketResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("<")) {
    throw new Error("Resposta nao e JSON (proxy off ou SPA)");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("JSON invalido na resposta de cotacoes");
  }
}

export function MarketTicker() {
  const [data, setData] = useState<MarketItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  async function loadData() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const { signal } = ac;

    const prev = parseStored()?.items ?? null;

    let rawItems: MarketItem[] | null = null;
    let savedAt: string | undefined;

    try {
      const res = await fetch("/api/market", { signal });

      if (res.ok) {
        const json = await safeParseMarketResponse(res);
        if (
          json &&
          typeof json === "object" &&
          "error" in json &&
          !("items" in (json as object))
        ) {
          throw new Error(
            String((json as { error?: unknown }).error ?? "Erro da API")
          );
        }
        const parsed = normalizeMarketApiPayload(json);
        if (parsed?.items?.length) {
          rawItems = parsed.items;
          savedAt = parsed.savedAt;
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.warn("Cotacoes /api/market:", e);
    }

    if (!rawItems?.length) {
      rawItems = await buildClientFallbackItems(prev, signal);
      savedAt = new Date().toISOString();
    }

    const merged = mergeMarketRows(rawItems, prev);
    setData(merged);
    saveStored(merged, savedAt);
  }

  useEffect(() => {
    const cached = parseStored();
    if (cached?.items?.length) {
      setData(cached.items);
    }
    void loadData();
    const interval = setInterval(() => void loadData(), 60_000);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-md border-y border-border bg-muted/80 sm:rounded-lg sm:rounded-none dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex animate-marquee whitespace-nowrap py-1.5 text-[11px] leading-tight sm:py-2 sm:text-xs md:text-sm">
        {[...data, ...data].map((item, i) => (
          <div
            key={i}
            className="mx-3 flex shrink-0 items-center gap-1.5 sm:mx-6 sm:gap-2 md:mx-8 md:gap-3"
          >
            <span className="text-muted-foreground">{item.name}</span>

            <span className="font-semibold tabular-nums text-foreground">
              {typeof item.value === "number"
                ? item.value.toFixed(2)
                : "--"}
            </span>

            {item.change != null ? (
              <span
                className={`font-semibold ${
                  item.change >= 0
                    ? "text-emerald-700 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {item.change >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(item.change).toFixed(2)}%
              </span>
            ) : (
              <span className="font-medium text-muted-foreground">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
