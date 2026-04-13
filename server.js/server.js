const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/api/ics-proxy", async (req, res) => {
  const urlParam = req.query?.url;
  if (!urlParam || typeof urlParam !== "string") {
    return res.status(400).json({ error: "Parâmetro url é obrigatório." });
  }

  let target;
  try {
    target = new URL(urlParam);
  } catch {
    return res.status(400).json({ error: "URL inválida." });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return res.status(400).json({ error: "Somente http(s)." });
  }

  const hostname = target.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")
  ) {
    return res.status(400).json({ error: "URL não permitida." });
  }

  try {
    const { data, status, statusText } = await axios.get(target.toString(), {
      responseType: "text",
      timeout: 25000,
      headers: {
        Accept: "text/calendar, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (compatible; CoffeePlanner/1.0; +https://vercel.app)",
      },
      validateStatus: () => true,
    });

    if (status < 200 || status >= 300) {
      return res
        .status(502)
        .json({ error: `Servidor do calendário respondeu ${status} ${statusText}.` });
    }

    const text = typeof data === "string" ? data : String(data ?? "");
    if (!text || text.length < 20) {
      return res.status(502).json({ error: "Resposta vazia do calendário." });
    }

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    return res.status(200).send(text);
  } catch (err) {
    const msg = err?.message || "Erro ao buscar ICS.";
    return res.status(502).json({ error: msg });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API local (ICS proxy) em http://localhost:${PORT}`);
});
