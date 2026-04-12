import { supabase } from "@/lib/supabase";

export type InsightTagPreset = {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  position: number;
};

export type InsightTextTemplate = {
  id: string;
  label: string;
  prefix: string;
  position: number;
};

const SEED_TAGS: { slug: string; label: string; emoji: string }[] = [
  { slug: "ideia", label: "Ideia", emoji: "💡" },
  { slug: "followup", label: "Follow-up", emoji: "📌" },
  { slug: "risco", label: "Risco", emoji: "⚠️" },
  { slug: "win", label: "Vitória", emoji: "🏆" },
];

const SEED_TEMPLATES: { label: string; prefix: string }[] = [
  { label: "Lembrete", prefix: "Lembrete: " },
  { label: "Revisar com equipe", prefix: "Revisar com a equipe: " },
  { label: "Métrica", prefix: "Métrica a acompanhar: " },
  { label: "Decisão", prefix: "Decisão tomada: " },
];

function randomSlug(): string {
  const u =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `c_${u}`;
}

/** IDs sintéticos quando o Supabase ainda não tem as tabelas (só UI local). */
export const LOCAL_FALLBACK_ID_PREFIX = "__local_";

export function isLocalFallbackPresetId(id: string): boolean {
  return id.startsWith(LOCAL_FALLBACK_ID_PREFIX);
}

function isTableMissingError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("does not exist") ||
    m.includes("pgrst205") ||
    (m.includes("could not find") && m.includes("table"))
  );
}

function localFallbackTagPresets(): InsightTagPreset[] {
  return SEED_TAGS.map((t, i) => ({
    id: `${LOCAL_FALLBACK_ID_PREFIX}tag_${i}`,
    slug: t.slug,
    label: t.label,
    emoji: t.emoji,
    position: i,
  }));
}

function localFallbackTextTemplates(): InsightTextTemplate[] {
  return SEED_TEMPLATES.map((t, i) => ({
    id: `${LOCAL_FALLBACK_ID_PREFIX}tpl_${i}`,
    label: t.label,
    prefix: t.prefix,
    position: i,
  }));
}

export function presetsTablesMissingHint(): string {
  return "Execute o SQL das tabelas quick_insight_tag_presets e quick_insight_text_templates no SQL Editor do Supabase.";
}

export async function loadTagPresetsWithSeed(): Promise<{
  items: InsightTagPreset[];
  error: string | null;
  usedLocalFallback: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], error: null, usedLocalFallback: false };

  const { data: rows, error } = await supabase
    .from("quick_insight_tag_presets")
    .select("id, slug, label, emoji, position")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (error) {
    if (isTableMissingError(error.message)) {
      return {
        items: localFallbackTagPresets(),
        error: null,
        usedLocalFallback: true,
      };
    }
    return { items: [], error: error.message, usedLocalFallback: false };
  }

  if (!rows?.length) {
    const insertPayload = SEED_TAGS.map((t, i) => ({
      user_id: user.id,
      slug: t.slug,
      label: t.label,
      emoji: t.emoji,
      position: i,
    }));
    const ins = await supabase
      .from("quick_insight_tag_presets")
      .insert(insertPayload)
      .select("id, slug, label, emoji, position");
    if (ins.error) {
      if (isTableMissingError(ins.error.message)) {
        return {
          items: localFallbackTagPresets(),
          error: null,
          usedLocalFallback: true,
        };
      }
      return { items: [], error: ins.error.message, usedLocalFallback: false };
    }
    return {
      items: (ins.data ?? []).map(mapTagRow),
      error: null,
      usedLocalFallback: false,
    };
  }

  return { items: rows.map(mapTagRow), error: null, usedLocalFallback: false };
}

export async function loadTextTemplatesWithSeed(): Promise<{
  items: InsightTextTemplate[];
  error: string | null;
  usedLocalFallback: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], error: null, usedLocalFallback: false };

  const { data: rows, error } = await supabase
    .from("quick_insight_text_templates")
    .select("id, label, prefix, position")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (error) {
    if (isTableMissingError(error.message)) {
      return {
        items: localFallbackTextTemplates(),
        error: null,
        usedLocalFallback: true,
      };
    }
    return { items: [], error: error.message, usedLocalFallback: false };
  }

  if (!rows?.length) {
    const insertPayload = SEED_TEMPLATES.map((t, i) => ({
      user_id: user.id,
      label: t.label,
      prefix: t.prefix,
      position: i,
    }));
    const ins = await supabase
      .from("quick_insight_text_templates")
      .insert(insertPayload)
      .select("id, label, prefix, position");
    if (ins.error) {
      if (isTableMissingError(ins.error.message)) {
        return {
          items: localFallbackTextTemplates(),
          error: null,
          usedLocalFallback: true,
        };
      }
      return { items: [], error: ins.error.message, usedLocalFallback: false };
    }
    return {
      items: (ins.data ?? []).map(mapTplRow),
      error: null,
      usedLocalFallback: false,
    };
  }

  return { items: rows.map(mapTplRow), error: null, usedLocalFallback: false };
}

function mapTagRow(r: {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  position: number;
}): InsightTagPreset {
  return {
    id: r.id,
    slug: r.slug,
    label: r.label,
    emoji: r.emoji || "💬",
    position: r.position,
  };
}

function mapTplRow(r: {
  id: string;
  label: string;
  prefix: string;
  position: number;
}): InsightTextTemplate {
  return {
    id: r.id,
    label: r.label,
    prefix: r.prefix,
    position: r.position,
  };
}

export async function updateTagPreset(
  id: string,
  patch: { label: string; emoji: string }
): Promise<{ error: string | null }> {
  if (isLocalFallbackPresetId(id)) {
    return { error: presetsTablesMissingHint() };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão não encontrada." };

  const label = patch.label.trim();
  const emoji = patch.emoji.trim().slice(0, 8) || "💬";
  if (!label) return { error: "Informe o nome da tag." };

  const { error } = await supabase
    .from("quick_insight_tag_presets")
    .update({ label, emoji })
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}

export async function insertTagPreset(input: {
  label: string;
  emoji: string;
}): Promise<{ item: InsightTagPreset | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { item: null, error: "Sessão não encontrada." };

  const label = input.label.trim();
  const emoji = input.emoji.trim().slice(0, 8) || "💬";
  if (!label) return { item: null, error: "Informe o nome da tag." };

  const { data: maxRow } = await supabase
    .from("quick_insight_tag_presets")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (maxRow?.position ?? -1) + 1;
  const slug = randomSlug();

  const { data, error } = await supabase
    .from("quick_insight_tag_presets")
    .insert({
      user_id: user.id,
      slug,
      label,
      emoji,
      position,
    })
    .select("id, slug, label, emoji, position")
    .single();

  if (error || !data) {
    if (isTableMissingError(error?.message)) {
      return { item: null, error: presetsTablesMissingHint() };
    }
    return { item: null, error: error?.message ?? "Falha ao criar tag." };
  }
  return { item: mapTagRow(data), error: null };
}

export async function deleteTagPreset(id: string): Promise<{
  error: string | null;
}> {
  if (isLocalFallbackPresetId(id)) {
    return { error: presetsTablesMissingHint() };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão não encontrada." };

  const { count, error: countErr } = await supabase
    .from("quick_insight_tag_presets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countErr) return { error: countErr.message };
  if ((count ?? 0) <= 1) {
    return { error: "Mantenha pelo menos uma tag." };
  }

  const { error } = await supabase
    .from("quick_insight_tag_presets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}

export async function updateTextTemplate(
  id: string,
  patch: { label: string; prefix: string }
): Promise<{ error: string | null }> {
  if (isLocalFallbackPresetId(id)) {
    return { error: presetsTablesMissingHint() };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão não encontrada." };

  const label = patch.label.trim();
  const prefix = patch.prefix;
  if (!label) return { error: "Informe o rótulo." };

  const { error } = await supabase
    .from("quick_insight_text_templates")
    .update({ label, prefix })
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}

export async function insertTextTemplate(input: {
  label: string;
  prefix: string;
}): Promise<{ item: InsightTextTemplate | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { item: null, error: "Sessão não encontrada." };

  const label = input.label.trim();
  if (!label) return { item: null, error: "Informe o rótulo." };

  const { data: maxRow } = await supabase
    .from("quick_insight_text_templates")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (maxRow?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("quick_insight_text_templates")
    .insert({
      user_id: user.id,
      label,
      prefix: input.prefix,
      position,
    })
    .select("id, label, prefix, position")
    .single();

  if (error || !data) {
    if (isTableMissingError(error?.message)) {
      return { item: null, error: presetsTablesMissingHint() };
    }
    return { item: null, error: error?.message ?? "Falha ao criar modelo." };
  }
  return { item: mapTplRow(data), error: null };
}

export async function deleteTextTemplate(id: string): Promise<{
  error: string | null;
}> {
  if (isLocalFallbackPresetId(id)) {
    return { error: presetsTablesMissingHint() };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão não encontrada." };

  const { count, error: countErr } = await supabase
    .from("quick_insight_text_templates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countErr) return { error: countErr.message };
  if ((count ?? 0) <= 1) {
    return { error: "Mantenha pelo menos um atalho de texto." };
  }

  const { error } = await supabase
    .from("quick_insight_text_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}
