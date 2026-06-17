import { requireUser } from "../_lib/auth";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin";
import { fetchCalendarEvents, refreshTokens } from "../_lib/msGraph";

/**
 * POST /api/outlook/sync
 * Lê os compromissos do Outlook do usuário (próximos 90 dias) e cria
 * atividades novas (sem duplicar). Exige Authorization: Bearer <jwt>.
 */
const SYNC_WINDOW_DAYS = 90;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Não autenticado." });

  const admin = getSupabaseAdmin();

  const { data: conn, error: connErr } = await admin
    .from("outlook_connections")
    .select("*")
    .eq("user_id", user.appId)
    .maybeSingle();

  if (connErr) return res.status(500).json({ error: "Erro ao ler a conexão." });
  if (!conn) {
    return res.status(409).json({ error: "Outlook não conectado.", connected: false });
  }

  // Garante um access_token válido (renova com o refresh_token se preciso).
  let accessToken: string | null = conn.access_token ?? null;
  const expired =
    !conn.token_expires_at ||
    new Date(conn.token_expires_at).getTime() < Date.now();

  if (expired || !accessToken) {
    if (!conn.refresh_token) {
      return res
        .status(409)
        .json({ error: "Conexão expirada. Conecte o Outlook novamente.", connected: false });
    }
    try {
      const t = await refreshTokens(conn.refresh_token);
      accessToken = t.access_token;
      await admin
        .from("outlook_connections")
        .update({
          access_token: t.access_token,
          refresh_token: t.refresh_token ?? conn.refresh_token,
          token_expires_at: new Date(
            Date.now() + (t.expires_in - 60) * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.appId);
    } catch {
      return res.status(409).json({
        error: "Não foi possível renovar a conexão. Conecte o Outlook novamente.",
        connected: false,
      });
    }
  }

  // Janela: agora .. +90 dias
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + SYNC_WINDOW_DAYS);
  end.setHours(23, 59, 59, 0);

  let events;
  try {
    events = await fetchCalendarEvents(
      accessToken as string,
      start.toISOString(),
      end.toISOString()
    );
  } catch (e: any) {
    return res.status(502).json({ error: e?.message || "Falha ao ler a agenda." });
  }

  const markSynced = () =>
    admin
      .from("outlook_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", user.appId);

  if (events.length === 0) {
    await markSynced();
    return res.status(200).json({ inserted: 0, total: 0 });
  }

  // Dedup contra atividades já existentes na janela.
  const dates = events.map((e) => e.date).sort();
  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];

  const { data: existing } = await admin
    .from("atividades")
    .select("data, hora, titulo")
    .eq("user_id", user.appId)
    .gte("data", rangeStart)
    .lte("data", rangeEnd);

  const norm = (v: string) => (v || "").trim().toLowerCase();
  const keyOf = (date: string, time: string | null, title: string) =>
    `${date}|${time || ""}|${norm(title)}`;

  const existingKeys = new Set(
    (existing || []).map((r: any) => keyOf(r.data, r.hora, r.titulo))
  );
  const seen = new Set<string>();
  const inserts: any[] = [];

  for (const ev of events) {
    const title = `[Outlook] ${ev.title}`;
    const key = keyOf(ev.date, ev.time, title);
    if (existingKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    inserts.push({
      user_id: user.appId,
      data: ev.date,
      hora: ev.time,
      titulo: title,
      prioridade: "media",
      completed: false,
    });
  }

  if (inserts.length > 0) {
    const { error: insErr } = await admin.from("atividades").insert(inserts);
    if (insErr) {
      return res.status(500).json({ error: "Falha ao salvar os eventos." });
    }
  }

  await markSynced();
  return res.status(200).json({ inserted: inserts.length, total: events.length });
}
