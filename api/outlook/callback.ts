import { verifyState } from "../_lib/auth.js";
import { exchangeCodeForTokens } from "../_lib/msGraph.js";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin.js";

/**
 * GET /api/outlook/callback
 * Endpoint para onde a Microsoft redireciona após o login.
 * Troca o "code" por tokens, salva a conexão e devolve o usuário ao app.
 * A autenticação aqui é feita pelo "state" assinado (HMAC), pois quem chama é o navegador.
 */
function appBase(): string {
  return process.env.APP_BASE_URL || "https://coffeplanner.online";
}

function redirect(res: any, url: string) {
  res.setHeader("Location", url);
  res.statusCode = 302;
  res.end();
}

export default async function handler(req: any, res: any) {
  const base = appBase();

  const errParam = req.query?.error_description || req.query?.error;
  const code = req.query?.code;
  const state = req.query?.state;

  const payload = verifyState<{ uid: string }>(
    typeof state === "string" ? state : ""
  );

  const failTarget = (msg: string) =>
    `${base}/user/${payload?.uid ?? ""}?outlook=erro&msg=${encodeURIComponent(msg)}`;

  if (errParam) return redirect(res, failTarget(String(errParam)));
  if (!code || typeof code !== "string") {
    return redirect(res, failTarget("Código de autorização ausente."));
  }
  if (!payload?.uid) {
    return redirect(res, failTarget("Sessão de conexão inválida ou expirada."));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const admin = getSupabaseAdmin();

    const tokenExpiresAt = new Date(
      Date.now() + (tokens.expires_in - 60) * 1000
    ).toISOString();
    const nowIso = new Date().toISOString();

    const { error } = await admin.from("outlook_connections").upsert(
      {
        user_id: payload.uid,
        refresh_token: tokens.refresh_token ?? null,
        access_token: tokens.access_token,
        token_expires_at: tokenExpiresAt,
        connected_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return redirect(res, failTarget("Não foi possível salvar a conexão."));
    }

    return redirect(res, `${base}/user/${payload.uid}?outlook=conectado`);
  } catch (e: any) {
    return redirect(res, failTarget(e?.message || "Falha ao conectar com o Outlook."));
  }
}
