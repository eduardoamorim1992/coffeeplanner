const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

let cache = null;
let lastUpdate = 0;

// ⏱️ cache de 5 minutos
const CACHE_TIME = 5 * 60 * 1000;

async function getAgroData() {
  const now = Date.now();

  if (cache && now - lastUpdate < CACHE_TIME) {
    return cache;
  }

  try {
    // 💵 DÓLAR
    const dolarRes = await axios.get(
      "https://economia.awesomeapi.com.br/json/last/USD-BRL"
    );
    const dolar = dolarRes.data.USDBRL;

    // 🌽 scraping CEPEA (simples e controlado)
    const res = await axios.get(
      "https://www.noticiasagricolas.com.br/cotacoes"
    );

    const html = res.data;

    function extract(nome) {
      const regex = new RegExp(nome + ".*?(\\d+,\\d+)", "i");
      const match = html.match(regex);
      return match ? Number(match[1].replace(",", ".")) : null;
    }

    const data = [
      {
        name: "Dólar",
        value: Number(dolar.bid),
        change: Number(dolar.pctChange),
      },
      {
        name: "Soja",
        value: extract("Soja"),
        change: 0,
      },
      {
        name: "Milho",
        value: extract("Milho"),
        change: 0,
      },
      {
        name: "Açúcar",
        value: extract("Açúcar"),
        change: 0,
      },
    ];

    cache = data;
    lastUpdate = now;

    return data;
  } catch (err) {
    console.error("Erro:", err);
    return cache || [];
  }
}

// 🔥 endpoint
app.get("/api/market", async (req, res) => {
  const data = await getAgroData();
  res.json(data);
});

app.listen(3001, () => {
  console.log("🚀 API rodando em http://localhost:3001");
});