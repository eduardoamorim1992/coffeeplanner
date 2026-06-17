import crypto from "node:crypto";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type AppUser = {
  authId: string;
  email: string | null;
  /** id na tabela public.users — é o que vai em atividades.user_id e outlook_connections.user_id */
  appId: string;
  nome: string | null;
};

function readBearer(req: any): string | null {
  const header = req?.headers?.authorization || req?.headers?.Authorization;
  if (!header || typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Valida o JWT do Supabase enviado em Authorization: Bearer <token>
 * e resolve a linha do usuário na tabela `users` (por id, com fallback por email,
 * mesmo padrão do restante do app). Retorna null se não autenticado.
 */
export async function requireUser(req: any): Promise<AppUser | null> {
  const token = readBearer(req);
  if (!token) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;

  const authUser = data.user;

  let row: { id: string; nome: string | null } | null = null;
  {
    const r = await admin
      .from("users")
      .select("id, nome")
      .eq("id", authUser.id)
      .maybeSingle();
    row = (r.data as any) ?? null;
  }
  if (!row && authUser.email) {
    const r = await admin
      .from("users")
      .select("id, nome")
      .eq("email", authUser.email.toLowerCase())
      .maybeSingle();
    row = (r.data as any) ?? null;
  }
  if (!row) return null;

  return {
    authId: authUser.id,
    email: authUser.email ?? null,
    appId: row.id,
    nome: row.nome ?? null,
  };
}

function stateSecret(): string {
  // Usa um segredo dedicado se existir; senão reaproveita a service role key (também secreta).
  return process.env.OUTLOOK_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

/** Assina um "state" curto (proteção CSRF do OAuth) com HMAC-SHA256. */
export function signState(payload: Record<string, unknown>): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: Date.now() })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", stateSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

/** Verifica e decodifica o "state". Retorna null se inválido ou expirado. */
export function verifyState<T = Record<string, unknown>>(
  state: string,
  maxAgeMs = 10 * 60 * 1000
): T | null {
  if (!state || typeof state !== "string" || !state.includes(".")) return null;
  const [body, sig] = state.split(".");
  const expected = crypto
    .createHmac("sha256", stateSecret())
    .update(body)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (
      typeof payload.iat === "number" &&
      Date.now() - payload.iat > maxAgeMs
    ) {
      return null;
    }
    return payload as T;
  } catch {
    return null;
  }
}
