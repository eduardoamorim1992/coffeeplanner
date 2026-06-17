import { requireUser } from "../_lib/auth.js";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin.js";

/**
 * GET /api/outlook/status
 * Informa se o usuário autenticado já conectou o Outlook.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Não autenticado." });

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("outlook_connections")
    .select("connected_at, last_synced_at, ms_email")
    .eq("user_id", user.appId)
    .maybeSingle();

  return res.status(200).json({
    connected: !!data,
    lastSyncedAt: data?.last_synced_at ?? null,
    email: data?.ms_email ?? null,
  });
}
