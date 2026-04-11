/**
 * Insights rápidos — persistência local por usuário (Supabase uid).
 */

export type QuickInsightTag = "ideia" | "followup" | "risco" | "win";

export type QuickInsight = {
  id: string;
  text: string;
  tags: QuickInsightTag[];
  contextLabel: string;
  route: string;
  createdAt: string;
  pinned?: boolean;
};

export const INSIGHT_TAG_PRESETS: {
  id: QuickInsightTag;
  label: string;
  emoji: string;
}[] = [
  { id: "ideia", label: "Ideia", emoji: "💡" },
  { id: "followup", label: "Follow-up", emoji: "📌" },
  { id: "risco", label: "Risco", emoji: "⚠️" },
  { id: "win", label: "Vitória", emoji: "🏆" },
];

const MAX_STORED = 80;

export function storageKeyForUser(userId: string | null | undefined): string {
  const id = userId?.trim() || "anon";
  return `corporate-compass-quick-insights:${id}`;
}

export function loadInsights(key: string): QuickInsight[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return sortInsights(j.filter(isValidInsight));
  } catch {
    return [];
  }
}

function isValidInsight(x: unknown): x is QuickInsight {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.text === "string" &&
    typeof o.contextLabel === "string" &&
    typeof o.route === "string" &&
    typeof o.createdAt === "string" &&
    Array.isArray(o.tags)
  );
}

export function sortInsights(items: QuickInsight[]): QuickInsight[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function saveInsights(key: string, items: QuickInsight[]): QuickInsight[] {
  const trimmed = sortInsights(items).slice(0, MAX_STORED);
  try {
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
  return trimmed;
}

export function insightSmartHint(text: string): string | null {
  const t = text.trim().toLowerCase();
  if (t.length < 4) return null;
  if (/\b(urgente|urgência|hoje|agora|já|ja|imediato|asap)\b/.test(t)) {
    return "Tom de urgência detectado — vale levar isso para uma tarefa com data no calendário.";
  }
  if (/\b(reunião|reuniao|1:1|one-on-one|call|video|teams|zoom)\b/.test(t)) {
    return "Parece ligado a conversa — a tag Follow-up ajuda a achar depois.";
  }
  if (/\b(meta|okr|kpi|indicador|performance|dashboard)\b/.test(t)) {
    return "Insight de resultado — combina com revisão no painel OKR.";
  }
  if (/\b(risco|problema|atraso|bloqueio|impedimento|bug)\b/.test(t)) {
    return "Possível risco ou bloqueio — marque com a tag Risco para priorizar.";
  }
  if (/\b(cliente|venda|contrato|proposta)\b/.test(t)) {
    return "Contexto comercial — anote números ou próximo passo para não perder o fio.";
  }
  return null;
}
