const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

const CACHE_FILE = path.join(__dirname, "..", "data", "market-last.json");
const CACHE_MS = 60 * 1000;

let memoryCache = { data: null, at: 0 };

function parseNum(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function loadDiskCache() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const j = JSON.parse(raw);
    if (j?.items && Array.isArray(j.items)) return j;
  } catch {
    /* empty */
  }
  return null;
}

function saveDiskCache(body) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(body, null, 2), "utf8");
  } catch (e) {
    console.error("market cache write:", e.message);
  }
}

function mergeWithPrevious(current, previousItems) {
  if (!previousItems?.length) return current;
  return current.map((item, i) => {
    const prev = previousItems[i];
    if (!prev) return item;
    return {
      ...item,
      value: item.value != null ? item.value : prev.value,
      change:
        item.change != null ? item.change : prev.change != null ? prev.change : null,
    };
  });
}

function extractCommodity(html, labels) {
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

async function fetchUsdAwesome() {
  const { data } = await axios.get(
    "https://economia.awesomeapi.com.br/json/last/USD-BRL",
    { headers: { Accept: "application/json" }, timeout: 15000 }
  );
  const d = data?.USDBRL;
  if (!d) return null;
  const value = parseNum(d.bid ?? d.ask);
  const change = parseNum(d.pctChange ?? d.varBid);
  return { name: "💵 Dólar", value, change };
}

async function fetchUsdBinance() {
  const { data } = await axios.get(
    "https://api.binance.com/api/v3/ticker/24hr?symbol=USDTBRL",
    { timeout: 15000 }
  );
  const value = parseNum(data?.lastPrice);
  const change = parseNum(data?.priceChangePercent);
  return { name: "💵 Dólar", value, change };
}

async function fetchUsd() {
  try {
    const a = await fetchUsdAwesome();
    if (a && a.value != null) return a;
  } catch (e) {
    console.warn("AwesomeAPI USD:", e.message);
  }
  try {
    const b = await fetchUsdBinance();
    if (b && b.value != null) return b;
  } catch (e) {
    console.warn("Binance USDTBRL:", e.message);
  }
  return { name: "💵 Dólar", value: null, change: null };
}

async function fetchCommodityHtml() {
  const { data } = await axios.get(
    "https://www.noticiasagricolas.com.br/cotacoes",
    {
      timeout: 20000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      responseType: "text",
    }
  );
  return typeof data === "string" ? data : "";
}

async function buildPayload() {
  const disk = loadDiskCache();
  const previousItems = disk?.items || null;

  const usdItem = await fetchUsd();

  let html = "";
  try {
    html = await fetchCommodityHtml();
  } catch (e) {
    console.warn("cotacoes HTML:", e.message);
  }

  const agro =
    html.length > 500
      ? [
          {
            name: "🌱 Soja",
            value: extractCommodity(html, ["Soja", "soja"]),
            change: null,
          },
          {
            name: "🌽 Milho",
            value: extractCommodity(html, ["Milho", "milho"]),
            change: null,
          },
          {
            name: "🍬 Açúcar",
            value: extractCommodity(html, ["Açúcar", "Acucar", "açúcar"]),
            change: null,
          },
        ]
      : [
          { name: "🌱 Soja", value: null, change: null },
          { name: "🌽 Milho", value: null, change: null },
          { name: "🍬 Açúcar", value: null, change: null },
        ];

  let items = [usdItem, ...agro];
  items = mergeWithPrevious(items, previousItems);

  const body = {
    items,
    savedAt: new Date().toISOString(),
  };

  saveDiskCache(body);
  return body;
}

app.get("/api/market", async (req, res) => {
  try {
    const now = Date.now();
    if (
      memoryCache.data &&
      now - memoryCache.at < CACHE_MS
    ) {
      return res.json(memoryCache.data);
    }

    const body = await buildPayload();
    memoryCache = { data: body, at: now };
    res.json(body);
  } catch (err) {
    console.error("GET /api/market:", err);
    const disk = loadDiskCache();
    if (disk?.items) {
      return res.json({
        ...disk,
        savedAt: disk.savedAt || new Date().toISOString(),
        stale: true,
      });
    }
    res.status(500).json({
      error: err?.message || "Erro ao buscar cotações",
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API de cotações em http://localhost:${PORT}`);
});
