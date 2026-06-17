/**
 * Cliente do frontend para a integração com o Outlook (Microsoft Graph).
 * Todas as chamadas enviam o JWT do Supabase no header Authorization.
 */
import { supabase } from "@/lib/supabase";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type OutlookStatus = {
  connected: boolean;
  lastSyncedAt: string | null;
  email: string | null;
};

export async function getOutlookStatus(): Promise<OutlookStatus> {
  const res = await fetch("/api/outlook/status", { headers: await authHeaders() });
  if (!res.ok) throw new Error("Falha ao verificar a conexão.");
  return res.json();
}

/** Inicia o fluxo de login da Microsoft (redireciona o navegador). */
export async function startOutlookConnect(): Promise<void> {
  const res = await fetch("/api/outlook/auth-url", { headers: await authHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) {
    throw new Error(json.error || "Não foi possível iniciar a conexão.");
  }
  window.location.href = json.url;
}

export type SyncResult = { inserted: number; total: number };

export async function syncOutlook(): Promise<SyncResult> {
  const res = await fetch("/api/outlook/sync", {
    method: "POST",
    headers: await authHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || "Falha ao sincronizar.") as Error & {
      connected?: boolean;
    };
    err.connected = json.connected;
    throw err;
  }
  return json as SyncResult;
}

export async function disconnectOutlook(): Promise<void> {
  const res = await fetch("/api/outlook/disconnect", {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Falha ao desconectar.");
}
