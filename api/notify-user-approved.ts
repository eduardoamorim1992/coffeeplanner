const RESEND_API_URL = "https://api.resend.com/emails";

type AnyReq = {
  method?: string;
  body?: {
    email?: string;
    nome?: string;
  };
};

type AnyRes = {
  status: (code: number) => AnyRes;
  json: (payload: unknown) => void;
};

function buildHtml(nome: string, loginUrl: string) {
  return `
  <div style="font-family: Inter, Arial, sans-serif; color: #111827;">
    <h2 style="margin-bottom: 8px;">Cadastro aprovado</h2>
    <p>Olá, ${nome}.</p>
    <p>Seu cadastro no <strong>CoffePlanner</strong> foi aprovado.</p>
    <p>Você já pode acessar o sistema pelo link abaixo:</p>
    <p><a href="${loginUrl}" target="_blank" rel="noreferrer">${loginUrl}</a></p>
    <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
      Este é um e-mail automático, não responda esta mensagem.
    </p>
  </div>
  `;
}

export default async function handler(req: AnyReq, res: AnyRes) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

  try {
    const upstream = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "Cadastro aprovado no CoffePlanner",
        html: buildHtml(nome || "usuário", loginUrl),
      }),
    });

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(502).json({
        error: "Falha ao enviar e-mail de aprovação.",
        detail: payload,
      });
    }

    return res.status(200).json({ ok: true, id: payload?.id || null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro inesperado no envio.";
    return res.status(502).json({ error: message });
  }
}
