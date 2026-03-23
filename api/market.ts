function extractCommodityPrice(html: string, label: string) {
  const regex = new RegExp(`${label}.*?(\\d+,\\d+)`, "i");
  const match = html.match(regex);
  return match ? Number(match[1].replace(",", ".")) : null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [usdResponse, commodityResponse] = await Promise.all([
      fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL"),
      fetch("https://www.noticiasagricolas.com.br/cotacoes"),
    ]);

    const usdJson = await usdResponse.json();
    const commodityHtml = await commodityResponse.text();

    const dollar = usdJson?.USDBRL || {};
    const dollarValue = Number(dollar.bid);
    const dollarChange = Number(dollar.pctChange);

    const payload = [
      {
        name: "💵 Dólar",
        value: Number.isFinite(dollarValue) ? dollarValue : null,
        change: Number.isFinite(dollarChange) ? dollarChange : null,
      },
      {
        name: "🌱 Soja",
        value: extractCommodityPrice(commodityHtml, "Soja"),
        change: null,
      },
      {
        name: "🌽 Milho",
        value: extractCommodityPrice(commodityHtml, "Milho"),
        change: null,
      },
      {
        name: "🍬 Açúcar",
        value: extractCommodityPrice(commodityHtml, "Açúcar"),
        change: null,
      },
    ];

    return res.status(200).json(payload);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Erro ao buscar cotações",
    });
  }
}
