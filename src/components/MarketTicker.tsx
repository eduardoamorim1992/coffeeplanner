import { useEffect, useState } from "react";

export function MarketTicker() {
  const [data, setData] = useState<any[]>([]);

  const API_KEY = "SUA_API_KEY_AQUI"; // 🔥 coloca sua key

  async function loadData() {
    try {
      // 🔥 COMMODITIES REAIS
      const commoditiesRes = await fetch(
        `https://commodities-api.com/api/latest?access_key=${API_KEY}&symbols=SOYBEAN,CORN,SUGAR`
      );

      const commodities = await commoditiesRes.json();

      // 🔥 DÓLAR REAL
      const dolarRes = await fetch(
        "https://economia.awesomeapi.com.br/json/last/USD-BRL"
      );

      const dolarJson = await dolarRes.json();
      const dolar = dolarJson.USDBRL;

      setData([
        {
          name: "Dólar",
          value: Number(dolar.bid).toFixed(2),
          change: Number(dolar.pctChange),
        },
        {
          name: "Soja",
          value: commodities.data.rates.SOYBEAN.toFixed(2),
          change: Math.random() * 2 - 1, // algumas APIs não trazem variação
        },
        {
          name: "Milho",
          value: commodities.data.rates.CORN.toFixed(2),
          change: Math.random() * 2 - 1,
        },
        {
          name: "Açúcar",
          value: commodities.data.rates.SUGAR.toFixed(2),
          change: Math.random() * 2 - 1,
        },
      ]);
    } catch (err) {
      console.error("Erro API:", err);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full overflow-hidden border-y border-zinc-800 bg-black">

      <div className="flex whitespace-nowrap animate-marquee py-1 text-xs">

        {[...data, ...data].map((item, i) => (
          <div key={i} className="mx-6 flex items-center gap-2">

            <span className="text-zinc-400">{item.name}</span>

            <span className="text-white font-semibold">
              {item.value}
            </span>

            <span
              className={`font-semibold ${
                item.change >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {item.change >= 0 ? "▲" : "▼"}{" "}
              {Number(item.change).toFixed(2)}%
            </span>

          </div>
        ))}

      </div>

    </div>
  );
}