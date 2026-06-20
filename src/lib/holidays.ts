/**
 * Feriados nacionais do Brasil — fixos + móveis (calculados a partir da Páscoa).
 * Carnaval e Corpus Christi são pontos facultativos, mas comumente exibidos no calendário.
 */

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function addDays(base: Date, days: number): Date {
  const r = new Date(base);
  r.setDate(r.getDate() + days);
  return r;
}

const cache = new Map<number, Record<string, string>>();

function holidaysForYear(year: number): Record<string, string> {
  const cached = cache.get(year);
  if (cached) return cached;

  const map: Record<string, string> = {
    [`${year}-01-01`]: "Confraternização Universal",
    [`${year}-04-21`]: "Tiradentes",
    [`${year}-05-01`]: "Dia do Trabalho",
    [`${year}-09-07`]: "Independência do Brasil",
    [`${year}-10-12`]: "Nossa Senhora Aparecida",
    [`${year}-11-02`]: "Finados",
    [`${year}-11-15`]: "Proclamação da República",
    [`${year}-11-20`]: "Consciência Negra",
    [`${year}-12-25`]: "Natal",
  };

  const easter = easterSunday(year);
  map[iso(addDays(easter, -47))] = "Carnaval";
  map[iso(addDays(easter, -2))] = "Sexta-feira Santa";
  map[iso(addDays(easter, 60))] = "Corpus Christi";

  cache.set(year, map);
  return map;
}

/** Nome do feriado nacional para a data (YYYY-MM-DD), ou null se não houver. */
export function getHolidayName(isoDate: string): string | null {
  const year = Number(isoDate.slice(0, 4));
  if (!year) return null;
  return holidaysForYear(year)[isoDate] ?? null;
}
