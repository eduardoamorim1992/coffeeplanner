import { useEffect, useState } from "react";

type MarketItem = {
  name: string;
  value: number | null;
  change: number | null;
};

export function MarketTicker() {
  const [data, setData] = useState<MarketItem[]>([]);

  async function loadFallbackData() {
    try {
      const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
      const json = await res.json();
      const dollar = json?.USDBRL || {};
      const dollarValue = Number(dollar.bid);
      const dollarChange = Number(dollar.pctChange);

      setData([
        {
          name: "💵 Dólar",
          value: Number.isFinite(dollarValue) ? dollarValue : null,
          change: Number.isFinite(dollarChange) ? dollarChange : null,
        },
        { name: "🌱 Soja", value: null, change: null },
        { name: "🌽 Milho", value: null, change: null },
        { name: "🍬 Açúcar", value: null, change: null },
      ]);
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

      if (!Array.isArray(json)) {
        throw new Error("Resposta invalida da API de cotacoes");
      }

      setData(json);
    } catch (err) {
      console.error("Erro ao carregar cotacoes:", err);
      await loadFallbackData();
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // 🔄 atualiza a cada 1 min
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

            <span
              className={`font-semibold ${
                (item.change ?? 0) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {(item.change ?? 0) >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(item.change ?? 0).toFixed(2)}%
            </span>
          </div>
        ))}

      </div>
    </div>
  );
}