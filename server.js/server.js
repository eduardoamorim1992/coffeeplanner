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

function parseLocaleNumber(v) {
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

function extractSectionValue(html, sectionLabel) {
  const escaped = sectionLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionRegex = new RegExp(
    `<h2>[^<]*${escaped}[^<]*<\\/h2>[\\s\\S]{0,8000}?<tbody>[\\s\\S]{0,5000}?<tr[^>]*>[\\s\\S]{0,1200}?<td[^>]*>[^<]*<\\/td>[\\s\\S]{0,1200}?<td[^>]*>([^<]+)<\\/td>(?:[\\s\\S]{0,1200}?<td[^>]*>([^<]+)<\\/td>)?`,
    "i"
  );
  const match = html.match(sectionRegex);
  if (!match) return { value: null, change: null };

  return {
    value: parseLocaleNumber(match[1]),
    change: parseLocaleNumber(match[2] ?? null),
  };
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

  const soja = html.length > 500 ? extractSectionValue(html, "Soja") : null;
  const milho = html.length > 500 ? extractSectionValue(html, "Milho") : null;
  const acucar = html.length > 500 ? extractSectionValue(html, "Açúcar") : null;

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
