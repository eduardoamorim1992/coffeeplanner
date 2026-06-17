/**
 * Helpers para OAuth 2.0 (Authorization Code) e leitura de calendário
 * via Microsoft Graph. Restrito ao tenant configurado em MS_TENANT_ID.
 */

const SCOPES = "openid profile email offline_access Calendars.Read";
const GRAPH_TIMEZONE = "America/Sao_Paulo";

function tenant(): string {
  return process.env.MS_TENANT_ID || "common";
}

function authBase(): string {
  return `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: process.env.MS_REDIRECT_URI || "",
    response_mode: "query",
    scope: SCOPES,
    state,
    prompt: "select_account",
  });
  return `${authBase()}/authorize?${params.toString()}`;
}

export type TokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

async function tokenRequest(extra: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(`${authBase()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID || "",
      client_secret: process.env.MS_CLIENT_SECRET || "",
      redirect_uri: process.env.MS_REDIRECT_URI || "",
      ...extra,
    }).toString(),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      json?.error_description || json?.error || "Falha ao obter token da Microsoft."
    );
  }
  return json as TokenSet;
}

export function exchangeCodeForTokens(code: string): Promise<TokenSet> {
  return tokenRequest({ grant_type: "authorization_code", code, scope: SCOPES });
}

export function refreshTokens(refreshToken: string): Promise<TokenSet> {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPES,
  });
}

export type GraphEvent = {
  title: string;
  date: string; // YYYY-MM-DD (horário local da empresa)
  time: string | null; // HH:MM ou null (evento de dia inteiro)
};

/**
 * Busca eventos entre [startIso, endIso] usando /me/calendarView,
 * que já expande reuniões recorrentes. Segue paginação (@odata.nextLink).
 */
export async function fetchCalendarEvents(
  accessToken: string,
  startIso: string,
  endIso: string
): Promise<GraphEvent[]> {
  const first =
    `https://graph.microsoft.com/v1.0/me/calendarView` +
    `?startDateTime=${encodeURIComponent(startIso)}` +
    `&endDateTime=${encodeURIComponent(endIso)}` +
    `&$select=subject,start,end,isAllDay` +
    `&$orderby=start/dateTime&$top=200`;

  const events: GraphEvent[] = [];
  let next: string | null = first;
  let guard = 0;

  while (next && guard < 15) {
    guard++;
    const res: Response = await fetch(next, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: `outlook.timezone="${GRAPH_TIMEZONE}"`,
      },
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error?.message || "Falha ao ler a agenda do Outlook.");
    }

    for (const ev of json.value || []) {
      const startDateTime: string = ev?.start?.dateTime || "";
      if (!startDateTime) continue;
      events.push({
        title: (ev.subject || "(sem título)").toString(),
        date: startDateTime.slice(0, 10), // YYYY-MM-DD
        time: ev.isAllDay ? null : startDateTime.slice(11, 16), // HH:MM
      });
    }

    next = json["@odata.nextLink"] || null;
  }

  return events;
}
