/**
 * Insights rápidos — tipos, ordenação e dicas (persistência no Supabase).
 */

export type QuickInsight = {
  id: string;
  text: string;
  /** Slugs estáveis (ex.: ideia, followup ou c_xxx para tags personalizadas). */
  tags: string[];
  contextLabel: string;
  route: string;
  createdAt: string;
  pinned?: boolean;
  /** Preenchido ao marcar "Concluído"; removido do banco ~24h depois. */
  completedAt?: string | null;
};

/** Rótulos padrão para slugs antigos ou presets removidos. */
const LEGACY_TAG_LABELS: Record<string, { emoji: string; label: string }> = {
  ideia: { emoji: "💡", label: "Ideia" },
  followup: { emoji: "📌", label: "Follow-up" },
  risco: { emoji: "⚠️", label: "Risco" },
  win: { emoji: "🏆", label: "Vitória" },
};

export type TagPresetLike = { slug: string; label: string; emoji: string };

export function resolveTagDisplay(
  slug: string,
  presets: TagPresetLike[]
): { emoji: string; label: string } {
  const p = presets.find((x) => x.slug === slug);
  if (p) return { emoji: p.emoji || "💬", label: p.label };
  const leg = LEGACY_TAG_LABELS[slug];
  if (leg) return leg;
  return { emoji: "🏷️", label: slug };
}

export function sortInsights(items: QuickInsight[]): QuickInsight[] {
  return [...items].sort((a, b) => {
    const ac = Boolean(a.completedAt);
    const bc = Boolean(b.completedAt);
    if (ac !== bc) return ac ? 1 : -1;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
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
