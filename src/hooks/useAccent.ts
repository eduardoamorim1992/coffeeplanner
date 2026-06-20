import { useEffect, useState } from "react";

export type AccentId =
  | "crimson"
  | "ocean"
  | "emerald"
  | "violet"
  | "amber"
  | "graphite";

/** Temas de cor disponíveis (o swatch é só a bolinha de prévia no seletor). */
export const ACCENTS: { id: AccentId; label: string; swatch: string }[] = [
  { id: "crimson", label: "Vermelho", swatch: "hsl(0 72% 51%)" },
  { id: "ocean", label: "Azul", swatch: "hsl(213 90% 56%)" },
  { id: "emerald", label: "Verde", swatch: "hsl(155 72% 43%)" },
  { id: "violet", label: "Roxo", swatch: "hsl(260 82% 64%)" },
  { id: "amber", label: "Âmbar", swatch: "hsl(33 92% 52%)" },
  { id: "graphite", label: "Grafite", swatch: "hsl(220 12% 58%)" },
];

const STORAGE_KEY = "accent";
const DEFAULT: AccentId = "crimson";

function getStored(): AccentId {
  const v = localStorage.getItem(STORAGE_KEY) as AccentId | null;
  return v && ACCENTS.some((a) => a.id === v) ? v : DEFAULT;
}

/** Aplica o tema de cor via `data-accent` no <html> e persiste no localStorage. */
export function useAccent() {
  const [accent, setAccent] = useState<AccentId>(getStored);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    localStorage.setItem(STORAGE_KEY, accent);
  }, [accent]);

  return { accent, setAccent, accents: ACCENTS };
}
