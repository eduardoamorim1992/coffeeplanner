/**
 * Busca e interpreta calendários ICS (ex.: link de assinatura do Outlook).
 * O fetch passa pelo proxy `/api/ics-proxy` para evitar CORS no navegador.
 */

export type IcsCalendarEvent = {
  uid: string;
  title: string;
  date: string;
  time: string | null;
};

function unfoldIcs(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function unescapeIcsText(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\N/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\\\/g, "\\");
}

function parseDtstartLine(line: string): {
  date: string;
  time: string | null;
} | null {
  const idx = line.indexOf(":");
  if (idx === -1) return null;
  const namePart = line.slice(0, idx);
  let valuePart = line.slice(idx + 1).trim();
  const zulu = /Z$/i.test(valuePart);
  valuePart = valuePart.replace(/Z$/i, "");

  const allDay = /VALUE=DATE/i.test(namePart) || /^\d{8}$/.test(valuePart);

  if (allDay && valuePart.length >= 8) {
    const date = valuePart.slice(0, 8);
    const y = date.slice(0, 4);
    const m = date.slice(4, 6);
    const d = date.slice(6, 8);
    return { date: `${y}-${m}-${d}`, time: null };
  }

  const m = valuePart.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/
  );
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  const time = `${m[4]}:${m[5]}`;
  void zulu;
  return { date, time };
}

function parseVeventBlock(block: string): IcsCalendarEvent | null {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

  let summary = "";
  let uid = "";
  let dtstartLine = "";

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith("SUMMARY")) {
      const idx = line.indexOf(":");
      if (idx !== -1) {
        summary = unescapeIcsText(line.slice(idx + 1));
      }
    } else if (upper.startsWith("UID")) {
      const idx = line.indexOf(":");
      if (idx !== -1) uid = line.slice(idx + 1).trim();
    } else if (upper.startsWith("DTSTART")) {
      dtstartLine = line;
    }
  }

  if (!dtstartLine) return null;

  const parsed = parseDtstartLine(dtstartLine);
  if (!parsed) return null;

  const title = summary.trim() || "Compromisso (calendário)";
  const stableUid = uid || `${parsed.date}|${parsed.time ?? ""}|${title}`;

  return {
    uid: stableUid,
    title,
    date: parsed.date,
    time: parsed.time,
  };
}

export function parseIcsText(raw: string): IcsCalendarEvent[] {
  const text = unfoldIcs(raw);
  const re = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
  const out: IcsCalendarEvent[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const ev = parseVeventBlock(m[1]);
    if (ev) out.push(ev);
  }
  return out;
}

export async function fetchIcsTextFromUrl(calendarUrl: string): Promise<string> {
  const trimmed = calendarUrl.trim();
  if (!trimmed) {
    throw new Error("Cole o link ICS do calendário.");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("URL inválida.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Use um link http ou https.");
  }

  const proxyUrl = `/api/ics-proxy?url=${encodeURIComponent(trimmed)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let msg = `Falha ao baixar o calendário (${res.status}).`;
    try {
      const j = JSON.parse(errText) as { error?: string };
      if (j?.error) msg = j.error;
      else if (errText.trim()) msg = errText.trim().slice(0, 220);
    } catch {
      if (errText.trim()) msg = errText.trim().slice(0, 220);
    }
    throw new Error(msg);
  }
  return res.text();
}

export function filterEventsWithinDays(
  events: IcsCalendarEvent[],
  daysAhead = 90
): IcsCalendarEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + daysAhead);

  return events.filter((ev) => {
    const [y, mo, d] = ev.date.split("-").map(Number);
    const dt = new Date(y, mo - 1, d);
    return dt >= today && dt <= limit;
  });
}
