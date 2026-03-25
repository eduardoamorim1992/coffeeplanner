/**
 * Proxy para baixar feed ICS sem CORS no browser (Vercel serverless).
 */

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const raw = req.query?.url;
  const urlParam = Array.isArray(raw) ? raw[0] : raw;
  if (!urlParam || typeof urlParam !== "string") {
    return res.status(400).json({ error: "Parâmetro url é obrigatório." });
  }

  let target: URL;
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "text/calendar, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (compatible; CoffeePlanner/1.0; +https://vercel.app)",
      },
    });

    if (!upstream.ok) {
      return res.status(502).json({
        error: `Servidor do calendário respondeu ${upstream.status}.`,
      });
    }

    const text = await upstream.text();
    if (!text || text.length < 20) {
      return res.status(502).json({ error: "Resposta vazia do calendário." });
    }

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    return res.status(200).send(text);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao buscar ICS.";
    return res.status(502).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
}
