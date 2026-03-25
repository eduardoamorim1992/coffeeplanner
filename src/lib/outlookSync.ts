import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
} from "@azure/msal-browser";

type OutlookEvent = {
  id: string;
  subject?: string | null;
  isAllDay?: boolean;
  start?: {
    dateTime?: string;
    timeZone?: string;
  };
};

const CLIENT_ID = import.meta.env.VITE_MS_CLIENT_ID as string | undefined;
const TENANT_ID = (import.meta.env.VITE_MS_TENANT_ID as string | undefined) || "common";
const REDIRECT_URI =
  (import.meta.env.VITE_MS_REDIRECT_URI as string | undefined) || window.location.origin;

const GRAPH_SCOPES = ["Calendars.Read"];

let msalApp: PublicClientApplication | null = null;

function getMsalApp(): PublicClientApplication {
  if (!CLIENT_ID) {
    throw new Error("Configure VITE_MS_CLIENT_ID para sincronizar o Outlook.");
  }
  if (!msalApp) {
    msalApp = new PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: REDIRECT_URI,
      },
      cache: {
        cacheLocation: "localStorage",
      },
    });
  }
  return msalApp;
}

async function getAccessToken(): Promise<string> {
  const app = getMsalApp();
  await app.initialize();
  await app.handleRedirectPromise();

  let account: AccountInfo | null = app.getActiveAccount();
  if (!account) {
    const all = app.getAllAccounts();
    account = all[0] || null;
    if (account) app.setActiveAccount(account);
  }

  if (!account) {
    const login = await app.loginPopup({ scopes: GRAPH_SCOPES });
    account = login.account;
    app.setActiveAccount(account);
  }

  try {
    const token = await app.acquireTokenSilent({
      account,
      scopes: GRAPH_SCOPES,
    });
    return token.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const token = await app.acquireTokenPopup({
        account,
        scopes: GRAPH_SCOPES,
      });
      return token.accessToken;
    }
    throw err;
  }
}

function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export async function fetchOutlookEvents(daysAhead = 30): Promise<
  Array<{
    externalId: string;
    title: string;
    date: string;
    time: string | null;
  }>
> {
  const accessToken = await getAccessToken();
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + daysAhead);

  const params = new URLSearchParams({
    startDateTime: now.toISOString(),
    endDateTime: end.toISOString(),
    $top: "300",
    $select: "id,subject,isAllDay,start",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Graph API ${res.status} ${txt.slice(0, 120)}`);
  }

  const json = (await res.json()) as { value?: OutlookEvent[] };
  const events = Array.isArray(json.value) ? json.value : [];

  return events
    .map((ev) => {
      const dateTime = ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
      if (!dateTime || Number.isNaN(dateTime.getTime())) return null;
      const title = (ev.subject || "").trim() || "Compromisso (Outlook)";
      return {
        externalId: ev.id,
        title,
        date: toIsoDateLocal(dateTime),
        time: ev.isAllDay ? null : toHHMM(dateTime),
      };
    })
    .filter((v): v is NonNullable<typeof v> => Boolean(v));
}
