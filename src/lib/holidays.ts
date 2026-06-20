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

/**
 * Principais feriados estaduais (datas fixas MM-DD), por UF.
 * Cobertura dos estados mais comuns — outros podem ser adicionados sob demanda.
 */
const STATE_HOLIDAYS: Record<string, { md: string; name: string }[]> = {
  AC: [{ md: "06-15", name: "Aniversário do Acre" }],
  AL: [{ md: "09-16", name: "Emancipação de Alagoas" }],
  AM: [{ md: "09-05", name: "Elevação do Amazonas a província" }],
  BA: [{ md: "07-02", name: "Independência da Bahia" }],
  CE: [{ md: "03-25", name: "Data Magna do Ceará" }],
  DF: [{ md: "11-30", name: "Dia do Evangélico" }],
  MA: [{ md: "07-28", name: "Adesão do Maranhão à Independência" }],
  MS: [{ md: "10-11", name: "Criação de Mato Grosso do Sul" }],
  PA: [{ md: "08-15", name: "Adesão do Grão-Pará à Independência" }],
  PE: [{ md: "03-06", name: "Revolução Pernambucana" }],
  PI: [{ md: "10-19", name: "Dia do Piauí" }],
  PR: [{ md: "12-19", name: "Emancipação do Paraná" }],
  RJ: [{ md: "04-23", name: "São Jorge" }],
  RO: [{ md: "01-04", name: "Criação de Rondônia" }],
  RS: [{ md: "09-20", name: "Revolução Farroupilha" }],
  SE: [{ md: "07-08", name: "Emancipação de Sergipe" }],
  SP: [{ md: "07-09", name: "Revolução Constitucionalista" }],
};

/**
 * Nome do feriado para a data (YYYY-MM-DD): nacional sempre; se `uf` for
 * informado, também os feriados daquele estado. Retorna null se não houver.
 */
export function getHolidayName(isoDate: string, uf?: string): string | null {
  const year = Number(isoDate.slice(0, 4));
  if (!year) return null;

  const national = holidaysForYear(year)[isoDate];
  if (national) return national;

  if (uf) {
    const md = isoDate.slice(5);
    const found = STATE_HOLIDAYS[uf]?.find((h) => h.md === md);
    if (found) return found.name;
  }
  return null;
}
