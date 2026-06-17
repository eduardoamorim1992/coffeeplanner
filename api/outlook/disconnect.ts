import { requireUser } from "../_lib/auth";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin";

/**
 * POST /api/outlook/disconnect
 * Remove a conexão do Outlook do usuário autenticado.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Não autenticado." });

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("outlook_connections")
    .delete()
    .eq("user_id", user.appId);

  if (error) return res.status(500).json({ error: "Falha ao desconectar." });
  return res.status(200).json({ ok: true });
}
