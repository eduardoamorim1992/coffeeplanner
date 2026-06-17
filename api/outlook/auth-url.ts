import { requireUser, signState } from "../_lib/auth";
import { buildAuthorizeUrl } from "../_lib/msGraph";

/**
 * GET /api/outlook/auth-url
 * Devolve a URL de login da Microsoft para o usuário autenticado.
 * Exige Authorization: Bearer <jwt do Supabase>.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Não autenticado." });

  if (!process.env.MS_CLIENT_ID || !process.env.MS_REDIRECT_URI) {
    return res
      .status(500)
      .json({ error: "Integração com o Outlook não está configurada." });
  }

  const state = signState({ uid: user.appId });
  return res.status(200).json({ url: buildAuthorizeUrl(state) });
}
