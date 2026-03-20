import { useEffect, useState } from "react";

type MarketItem = {
  name: string;
  value: string;
  change: number;
};

export function MarketTicker() {
  const [data, setData] = useState<MarketItem[]>([]);

  const API_KEY = "f402727c80b7400686f1bef9be0f11b8"; // 🔥 COLOCA SUA NOVA KEY (gera outra!)

  async function fetchQuote(symbol: string) {
    try {
      const res = await fetch(
        `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${API_KEY}`
      );
      const json = await res.json();

      if (json.status === "error") {
        console.error("Erro TwelveData:", json);
        return null;
      }

      return {
        price: Number(json.close),
        change: Number(json.percent_change),
      };
    } catch (err) {
      console.error("Erro fetch:", err);
      return null;
    }
  }

  async function loadData() {
    try {
      const [dolar, soja, milho, acucar] = await Promise.all([
        fetchQuote("USD/BRL"),
        fetchQuote("ZS"), // soja
        fetchQuote("ZC"), // milho
        fetchQuote("SB"), // açúcar
      ]);

      const newData: MarketItem[] = [
        {
          name: "💵 Dólar",
          value: dolar ? dolar.price.toFixed(2) : "--",
          change: dolar ? dolar.change : 0,
        },
        {
          name: "🌱 Soja",
          value: soja ? soja.price.toFixed(2) : "--",
          change: soja ? soja.change : 0,
        },
        {
          name: "🌽 Milho",
          value: milho ? milho.price.toFixed(2) : "--",
          change: milho ? milho.change : 0,
        },
        {
          name: "🍬 Açúcar",
          value: acucar ? acucar.price.toFixed(2) : "--",
          change: acucar ? acucar.change : 0,
        },
      ];

      setData(newData);
    } catch (err) {
      console.error("Erro geral:", err);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // 🔄 atualiza a cada 1 min
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full overflow-hidden border-y border-zinc-800 bg-black">
      <div className="flex whitespace-nowrap animate-marquee py-2 text-sm">

        {[...data, ...data].map((item, i) => (
          <div
            key={i}
            className="mx-8 flex items-center gap-3"
          >
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
              {Math.abs(item.change).toFixed(2)}%
            </span>
          </div>
        ))}

      </div>
    </div>
  );
}