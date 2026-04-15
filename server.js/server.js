const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

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

app.post("/api/notify-user-approved", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const nome = String(req.body?.nome || "").trim();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Email inválido." });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY não configurada." });
  }

  const loginUrl = process.env.APP_LOGIN_URL || "https://coffeplanner.online/login";
  const fromEmail = process.env.APP_FROM_EMAIL || "CoffePlanner <no-reply@coffeplanner.online>";
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #111827;">
      <h2 style="margin-bottom: 8px;">Cadastro aprovado</h2>
      <p>Olá, ${nome || "usuário"}.</p>
      <p>Seu cadastro no <strong>CoffePlanner</strong> foi aprovado.</p>
      <p>Você já pode acessar o sistema pelo link abaixo:</p>
      <p><a href="${loginUrl}" target="_blank" rel="noreferrer">${loginUrl}</a></p>
      <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
        Este é um e-mail automático, não responda esta mensagem.
      </p>
    </div>
  `;

  try {
    const { data } = await axios.post(
      "https://api.resend.com/emails",
      {
        from: fromEmail,
        to: [email],
        subject: "Cadastro aprovado no CoffePlanner",
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    return res.status(200).json({ ok: true, id: data?.id || null });
  } catch (err) {
    const detail = err?.response?.data || err?.message || "Falha ao enviar e-mail.";
    return res.status(502).json({ error: "Falha ao enviar e-mail de aprovação.", detail });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API local (ICS proxy) em http://localhost:${PORT}`);
});
