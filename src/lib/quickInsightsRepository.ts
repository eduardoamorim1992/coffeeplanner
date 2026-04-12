import { supabase } from "@/lib/supabase";
import { sortInsights, type QuickInsight } from "@/lib/quickInsights";

const MS_24H = 24 * 60 * 60 * 1000;

type QuickInsightRow = {
  id: string;
  body: string;
  tags: string[] | null;
  context_label: string;
  route: string;
  pinned: boolean;
  created_at: string;
  completed_at: string | null;
};

function sanitizeTags(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return ["ideia"];
  const out = raw
    .map((t) => String(t).trim().slice(0, 48))
    .filter(Boolean);
  const unique = [...new Set(out)].slice(0, 12);
  return unique.length ? unique : ["ideia"];
}

export function insightFromRow(row: QuickInsightRow): QuickInsight {
  return {
    id: row.id,
    text: row.body,
    tags: sanitizeTags(row.tags),
    contextLabel: row.context_label ?? "",
    route: row.route ?? "",
    createdAt: row.created_at,
    pinned: Boolean(row.pinned),
    completedAt: row.completed_at ?? null,
  };
}

async function purgeExpiredCompletedInsights(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - MS_24H).toISOString();
  await supabase
    .from("quick_insights")
    .delete()
    .eq("user_id", userId)
    .lt("completed_at", cutoff);
}

export async function fetchQuickInsightsForCurrentUser(): Promise<{
  items: QuickInsight[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { items: [], error: null };
  }

  await purgeExpiredCompletedInsights(user.id);

  const { data, error } = await supabase
    .from("quick_insights")
    .select(
      "id, body, tags, context_label, route, pinned, created_at, completed_at"
    )
    .eq("user_id", user.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { items: [], error: error.message };
  }

  const rows = (data ?? []) as QuickInsightRow[];
  return {
    items: sortInsights(rows.map(insightFromRow)),
    error: null,
  };
}

export async function insertQuickInsight(input: {
  text: string;
  tags: string[];
  contextLabel: string;
  route: string;
}): Promise<{ item: QuickInsight | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { item: null, error: "Sessão não encontrada." };
  }

  const tags = sanitizeTags(input.tags);

  const { data, error } = await supabase
    .from("quick_insights")
    .insert({
      user_id: user.id,
      body: input.text.trim(),
      tags,
      context_label: input.contextLabel,
      route: input.route,
      pinned: false,
    })
    .select(
      "id, body, tags, context_label, route, pinned, created_at, completed_at"
    )
    .single();

  if (error || !data) {
    return { item: null, error: error?.message ?? "Falha ao salvar." };
  }

  return { item: insightFromRow(data as QuickInsightRow), error: null };
}

export async function updateQuickInsightPinned(
  id: string,
  pinned: boolean
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão não encontrada." };
  }

  const { error } = await supabase
    .from("quick_insights")
    .update({
      pinned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}

export async function updateQuickInsightBody(
  id: string,
  body: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão não encontrada." };
  }

  const text = body.trim();
  if (!text) {
    return { error: "O texto não pode ficar vazio." };
  }
  if (text.length > 8000) {
    return { error: "Texto muito longo (máx. 8000 caracteres)." };
  }

  const { error } = await supabase
    .from("quick_insights")
    .update({
      body: text,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("completed_at", null);

  return { error: error?.message ?? null };
}

export async function markQuickInsightCompleted(
  id: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão não encontrada." };
  }

  const { error } = await supabase
    .from("quick_insights")
    .update({
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("completed_at", null);

  return { error: error?.message ?? null };
}

export async function deleteQuickInsight(id: string): Promise<{
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão não encontrada." };
  }

  const { error } = await supabase
    .from("quick_insights")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}
