import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Drawer } from "vaul";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  Pencil,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  insightSmartHint,
  resolveTagDisplay,
  type QuickInsight,
} from "@/lib/quickInsights";
import {
  deleteQuickInsight,
  fetchQuickInsightsForCurrentUser,
  insertQuickInsight,
  markQuickInsightCompleted,
  updateQuickInsightBody,
  updateQuickInsightPinned,
} from "@/lib/quickInsightsRepository";
import {
  deleteTagPreset,
  deleteTextTemplate,
  insertTagPreset,
  insertTextTemplate,
  loadTagPresetsWithSeed,
  loadTextTemplatesWithSeed,
  updateTagPreset,
  updateTextTemplate,
  type InsightTagPreset,
  type InsightTextTemplate,
} from "@/lib/insightPresetsRepository";
import { toast } from "sonner";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: {
    results: { [k: number]: { [k: number]: { transcript: string } } };
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type QuickInsightCaptureProps = {
  contextLabel: string;
  reserveMobileNav?: boolean;
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

function TagPresetEditorRow({
  preset,
  onRefresh,
}: {
  preset: InsightTagPreset;
  onRefresh: () => Promise<void>;
}) {
  const [emoji, setEmoji] = useState(preset.emoji);
  const [label, setLabel] = useState(preset.label);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmoji(preset.emoji);
    setLabel(preset.label);
  }, [preset.id, preset.emoji, preset.label]);

  const save = async () => {
    setBusy(true);
    const { error } = await updateTagPreset(preset.id, { label, emoji });
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.message("Tag salva");
      await onRefresh();
    }
  };

  const del = async () => {
    if (
      !confirm(
        "Remover esta tag? Anotações antigas que a usam podem mostrar só o código da tag."
      )
    ) {
      return;
    }
    setBusy(true);
    const { error } = await deleteTagPreset(preset.id);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.message("Tag removida");
      await onRefresh();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-2">
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value.slice(0, 8))}
        className="w-12 rounded-md border border-border bg-background px-2 py-1.5 text-center text-sm"
        title="Emoji ou ícone"
        aria-label="Emoji"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Nome da tag"
        className="min-w-[8rem] flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Salvar
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void del()}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        title="Excluir tag"
        aria-label="Excluir tag"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function NewTagForm({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [emoji, setEmoji] = useState("💬");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!label.trim()) {
      toast.message("Digite o nome da nova tag");
      return;
    }
    setBusy(true);
    const { error } = await insertTagPreset({ label, emoji });
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success("Tag criada");
      setLabel("");
      setEmoji("💬");
      await onRefresh();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2">
      <Plus className="h-4 w-4 shrink-0 text-primary" />
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value.slice(0, 8))}
        className="w-12 rounded-md border border-border bg-background px-2 py-1.5 text-center text-sm"
        aria-label="Emoji da nova tag"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Nova tag…"
        className="min-w-[8rem] flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void add()}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        Adicionar
      </button>
    </div>
  );
}

function TemplateEditorRow({
  tpl,
  onRefresh,
}: {
  tpl: InsightTextTemplate;
  onRefresh: () => Promise<void>;
}) {
  const [label, setLabel] = useState(tpl.label);
  const [prefix, setPrefix] = useState(tpl.prefix);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLabel(tpl.label);
    setPrefix(tpl.prefix);
  }, [tpl.id, tpl.label, tpl.prefix]);

  const save = async () => {
    setBusy(true);
    const { error } = await updateTextTemplate(tpl.id, { label, prefix });
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.message("Modelo salvo");
      await onRefresh();
    }
  };

  const del = async () => {
    if (!confirm("Remover este atalho de texto?")) return;
    setBusy(true);
    const { error } = await deleteTextTemplate(tpl.id);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.message("Removido");
      await onRefresh();
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-2">
      <div className="flex flex-wrap gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nome do botão"
          className="min-w-[6rem] flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium hover:bg-muted"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Salvar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void del()}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Excluir modelo"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={prefix}
        onChange={(e) => setPrefix(e.target.value)}
        placeholder="Texto que será inserido no campo…"
        rows={2}
        className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs"
      />
    </div>
  );
}

function NewTemplateForm({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [label, setLabel] = useState("");
  const [prefix, setPrefix] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!label.trim()) {
      toast.message("Informe o nome do atalho");
      return;
    }
    setBusy(true);
    const { error } = await insertTextTemplate({
      label,
      prefix: prefix || `${label}: `,
    });
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success("Atalho criado");
      setLabel("");
      setPrefix("");
      await onRefresh();
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <Plus className="h-4 w-4 text-primary" />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nome do botão"
          className="min-w-[6rem] flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void add()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      <textarea
        value={prefix}
        onChange={(e) => setPrefix(e.target.value)}
        placeholder="Texto a inserir (ex.: Lembrete: )"
        rows={2}
        className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs"
      />
    </div>
  );
}

const MS_24H = 24 * 60 * 60 * 1000;

function formatTimeUntilPurge(completedAt: string): string {
  const end = new Date(completedAt).getTime() + MS_24H;
  const ms = Math.max(0, end - Date.now());
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.max(1, Math.ceil(ms / (60 * 1000)));
  if (ms <= 0) return "em instantes";
  if (h >= 1) return `~${h} h`;
  return `~${m} min`;
}

function InsightListCard({
  it,
  tagPresets,
  onRefresh,
  onTogglePin,
  onCopy,
  onRemove,
}: {
  it: QuickInsight;
  tagPresets: InsightTagPreset[];
  onRefresh: () => Promise<void>;
  onTogglePin: (id: string) => void;
  onCopy: (item: QuickInsight) => void;
  onRemove: (id: string) => void;
}) {
  const [body, setBody] = useState(it.text);
  const [savingBody, setSavingBody] = useState(false);
  const completed = Boolean(it.completedAt);

  useEffect(() => {
    setBody(it.text);
  }, [it.id, it.text]);

  const saveBody = async () => {
    if (completed) return;
    const t = body.trim();
    if (!t) {
      toast.error("O texto não pode ficar vazio");
      setBody(it.text);
      return;
    }
    if (t === it.text) return;
    setSavingBody(true);
    const { error } = await updateQuickInsightBody(it.id, t);
    setSavingBody(false);
    if (error) {
      toast.error(error);
      setBody(it.text);
      return;
    }
    await onRefresh();
  };

  const complete = async () => {
    const { error } = await markQuickInsightCompleted(it.id);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Concluído", {
      description: "Esta anotação será excluída automaticamente após 24 horas.",
    });
    await onRefresh();
  };

  return (
    <li
      className={cn(
        "rounded-xl border border-border bg-muted/30 p-3 text-sm",
        completed && "border-emerald-500/25 bg-emerald-500/[0.06]"
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="font-medium text-foreground/80">
          {it.contextLabel}
        </span>
        <span>·</span>
        <time dateTime={it.createdAt}>
          {new Date(it.createdAt).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
        {completed && it.completedAt ? (
          <>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              Concluído · some {formatTimeUntilPurge(it.completedAt)}
            </span>
          </>
        ) : null}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => void saveBody()}
        disabled={completed}
        rows={4}
        className={cn(
          "mb-2 w-full resize-y rounded-lg border border-border bg-background px-2.5 py-2 text-sm leading-relaxed text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
          completed && "cursor-not-allowed opacity-80"
        )}
        aria-label="Texto do insight"
      />
      {savingBody ? (
        <p className="mb-1 text-[10px] text-muted-foreground">Salvando…</p>
      ) : null}

      <div className="mt-1 flex flex-wrap gap-1">
        {it.tags.map((slug, ti) => {
          const d = resolveTagDisplay(slug, tagPresets);
          return (
            <span
              key={`${it.id}-t-${ti}-${slug}`}
              className="rounded-md bg-background/80 px-1.5 py-px text-[10px] text-muted-foreground"
            >
              {d.emoji} {d.label}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!completed ? (
          <button
            type="button"
            onClick={() => void complete()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Concluído
          </button>
        ) : null}
        <div className="ms-auto flex gap-1">
          <button
            type="button"
            onClick={() => onTogglePin(it.id)}
            disabled={completed}
            className={cn(
              "rounded-lg p-1.5 text-muted-foreground hover:bg-muted",
              it.pinned && "text-amber-600",
              completed && "pointer-events-none opacity-40"
            )}
            title={it.pinned ? "Desafixar" : "Fixar no topo"}
          >
            <Pin
              className="h-4 w-4"
              fill={it.pinned ? "currentColor" : "none"}
            />
          </button>
          <button
            type="button"
            onClick={() => onCopy(it)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            title="Copiar"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(it.id)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

export function QuickInsightCapture({
  contextLabel,
  reserveMobileNav = false,
}: QuickInsightCaptureProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<QuickInsight[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["ideia"]);
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void; start: () => void } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [tagPresets, setTagPresets] = useState<InsightTagPreset[]>([]);
  const [textTemplates, setTextTemplates] = useState<InsightTextTemplate[]>(
    []
  );
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [editTags, setEditTags] = useState(false);
  const [editTemplates, setEditTemplates] = useState(false);
  const [presetsNeedMigration, setPresetsNeedMigration] = useState(false);

  const refreshPresetsAndList = useCallback(async () => {
    setListLoading(true);
    setPresetsLoading(true);
    const [lr, tr, rr] = await Promise.all([
      fetchQuickInsightsForCurrentUser(),
      loadTagPresetsWithSeed(),
      loadTextTemplatesWithSeed(),
    ]);
    setListLoading(false);
    setPresetsLoading(false);

    if (lr.error) {
      toast.error("Não foi possível carregar os insights", {
        description: lr.error,
      });
    } else {
      setList(lr.items);
    }
    if (tr.error) {
      toast.error("Não foi possível carregar as tags", {
        description: tr.error,
      });
      setTagPresets([]);
    } else {
      setTagPresets(tr.items);
    }
    if (rr.error) {
      toast.error("Não foi possível carregar os atalhos de texto", {
        description: rr.error,
      });
      setTextTemplates([]);
    } else {
      setTextTemplates(rr.items);
    }

    const needSql = tr.usedLocalFallback || rr.usedLocalFallback;
    setPresetsNeedMigration(needSql);
    if (needSql) {
      setEditTags(false);
      setEditTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (open) void refreshPresetsAndList();
  }, [open, refreshPresetsAndList]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshPresetsAndList();
    });
    return () => subscription.unsubscribe();
  }, [refreshPresetsAndList]);

  useEffect(() => {
    if (!tagPresets.length) return;
    setSelectedTags((prev) => {
      const valid = prev.filter((s) => tagPresets.some((p) => p.slug === s));
      if (valid.length) return valid;
      const firstIdeia = tagPresets.find((p) => p.slug === "ideia");
      return [firstIdeia?.slug ?? tagPresets[0].slug];
    });
  }, [tagPresets]);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      (window as Window & { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition ||
        (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition
    );
  }, []);

  const hint = useMemo(() => insightSmartHint(draft), [draft]);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (it) =>
        it.text.toLowerCase().includes(q) ||
        it.contextLabel.toLowerCase().includes(q) ||
        it.tags.some((t) => t.includes(q))
    );
  }, [list, query]);

  const toggleTag = (slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    );
  };

  const handleSave = async () => {
    const text = draft.trim();
    if (!text) {
      toast.message("Escreva algo antes de salvar", {
        description: "Uma frase já basta para não perder o insight.",
      });
      return;
    }
    const tagsToSave =
      selectedTags.length > 0
        ? [...selectedTags]
        : [tagPresets[0]?.slug ?? "ideia"];
    setSaving(true);
    const { item, error } = await insertQuickInsight({
      text,
      tags: tagsToSave,
      contextLabel,
      route: location.pathname,
    });
    setSaving(false);
    if (error || !item) {
      toast.error("Não foi possível salvar", {
        description: error ?? "Tente novamente.",
      });
      return;
    }
    setDraft("");
    setSelectedTags([tagPresets.find((p) => p.slug === "ideia")?.slug ?? tagPresets[0]?.slug ?? "ideia"]);
    await refreshPresetsAndList();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch {
        /* alguns navegadores bloqueiam */
      }
    }
    toast.success("Insight guardado", {
      description: "Sincronizado com o banco de dados da sua conta.",
    });
    textareaRef.current?.focus();
  };

  const removeOne = async (id: string) => {
    const { error } = await deleteQuickInsight(id);
    if (error) {
      toast.error("Não foi possível excluir", { description: error });
      return;
    }
    await refreshPresetsAndList();
    toast.message("Removido");
  };

  const togglePin = async (id: string) => {
    const current = list.find((x) => x.id === id);
    if (!current) return;
    const next = !current.pinned;
    const { error } = await updateQuickInsightPinned(id, next);
    if (error) {
      toast.error("Não foi possível atualizar", { description: error });
      return;
    }
    await refreshPresetsAndList();
  };

  const copyOne = async (it: QuickInsight) => {
    const tagStr = it.tags
      .map((slug) => {
        const d = resolveTagDisplay(slug, tagPresets);
        return d.label;
      })
      .join(", ");
    const block = `**${it.contextLabel}**\n${tagStr}\n${it.text}\n_${new Date(it.createdAt).toLocaleString("pt-BR")}_`;
    try {
      await navigator.clipboard.writeText(block);
      toast.success("Copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const copyAllMarkdown = async () => {
    if (!list.length) return;
    const body = list
      .map((it) => {
        const tags = it.tags
          .map((s) => resolveTagDisplay(s, tagPresets).label)
          .join(", ");
        return `### ${it.contextLabel}\n- ${tags}\n${it.text}\n`;
      })
      .join("\n");
    const md = `# Insights rápidos\n\n${body}`;
    try {
      await navigator.clipboard.writeText(md);
      toast.success(`${list.length} insight(s) em Markdown`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const win = window as Window & {
      webkitSpeechRecognition?: new () => SpeechRec;
      SpeechRecognition?: new () => SpeechRec;
    };
    const W = win.webkitSpeechRecognition ?? win.SpeechRecognition;
    if (!W) {
      toast.message("Voz indisponível neste navegador");
      return;
    }
    stopListening();
    const rec = new W();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: {
      results: { [k: number]: { [k: number]: { transcript: string } } };
    }) => {
      const t = e.results[0]?.[0]?.transcript?.trim();
      if (t) {
        setDraft((d) => (d.trim() ? `${d.trim()} ${t}` : t));
      }
    };
    rec.onerror = () => {
      setListening(false);
      toast.message("Não entendi o áudio — tente de novo");
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      toast.message("Ouvindo…", { description: "Fale em português." });
    } catch {
      setListening(false);
      toast.error("Microfone bloqueado ou indisponível");
    }
  }, [stopListening]);

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.altKey && e.shiftKey && e.code === "KeyI") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => textareaRef.current?.focus(), 200);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const drawerDir = isMobile ? "bottom" : "right";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Insight rápido — Alt+Shift+I"
        aria-label="Abrir captura de insight rápido"
        className={cn(
          "fixed z-50 flex h-14 w-14 items-center justify-center rounded-2xl",
          "bg-gradient-to-br from-primary to-red-600 text-primary-foreground",
          "shadow-lg shadow-primary/30 ring-2 ring-white/20 transition",
          "hover:scale-[1.04] hover:shadow-xl active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          reserveMobileNav
            ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 md:bottom-8 md:right-8"
            : "bottom-8 right-4 md:right-8"
        )}
      >
        <span className="relative flex h-9 w-9 items-center justify-center">
          <Sparkles className="h-6 w-6" strokeWidth={2} />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-amber-950 shadow">
            +
          </span>
        </span>
      </button>

      <Drawer.Root
        open={open}
        onOpenChange={setOpen}
        direction={drawerDir}
        shouldScaleBackground={isMobile}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]" />
          <Drawer.Content
            className={cn(
              "fixed z-[61] flex flex-col border-border bg-card shadow-2xl",
              drawerDir === "bottom"
                ? "inset-x-0 bottom-0 mt-24 max-h-[90vh] rounded-t-[20px] border-t"
                : "bottom-2 right-2 top-2 w-[min(100vw-1rem,440px)] rounded-xl border"
            )}
          >
            <div
              className={cn(
                "mx-auto shrink-0 rounded-full bg-muted",
                drawerDir === "bottom" ? "my-3 h-1.5 w-12" : "hidden"
              )}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden px-4 pb-4 pt-1 md:px-5 md:pb-5 md:pt-2">
              <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border pb-3">
                <div>
                  <Drawer.Title className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Insight rápido
                  </Drawer.Title>
                  <Drawer.Description className="mt-1 text-xs text-muted-foreground">
                    Contexto:{" "}
                    <span className="font-medium text-foreground">
                      {contextLabel}
                    </span>
                    <span className="mx-1 opacity-50">·</span>
                    Salvo no banco na sua conta
                    <span className="mx-1 opacity-50">·</span>
                    <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px]">
                      Alt+Shift+I
                    </kbd>
                  </Drawer.Description>
                </div>
                <Drawer.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Fechar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Drawer.Close>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-3">
                {presetsNeedMigration ? (
                  <div
                    className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-950 dark:text-amber-100"
                    role="status"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium">Falta criar tabelas no Supabase</p>
                      <p className="mt-1 text-[11px] opacity-90">
                        As tabelas{" "}
                        <code className="rounded bg-background/60 px-1 py-px font-mono text-[10px]">
                          quick_insight_tag_presets
                        </code>{" "}
                        e{" "}
                        <code className="rounded bg-background/60 px-1 py-px font-mono text-[10px]">
                          quick_insight_text_templates
                        </code>{" "}
                        ainda não existem. Abra o{" "}
                        <strong>SQL Editor</strong> no painel do Supabase, cole o
                        script do arquivo{" "}
                        <code className="font-mono text-[10px]">
                          supabase/migrations/20250412000000_insight_presets_templates.sql
                        </code>{" "}
                        e execute. Depois recarregue esta tela — tags e atalhos
                        padrão já aparecem abaixo para você usar agora.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Tags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Tags
                    </span>
                    {!presetsNeedMigration ? (
                      <button
                        type="button"
                        onClick={() => setEditTags((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Pencil className="h-3 w-3" />
                        {editTags ? "Concluir" : "Editar tags"}
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        Edição após rodar o SQL
                      </span>
                    )}
                  </div>

                  {presetsLoading && !tagPresets.length ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando tags…
                    </div>
                  ) : editTags ? (
                    <div className="space-y-2">
                      {tagPresets.map((p) => (
                        <TagPresetEditorRow
                          key={p.id}
                          preset={p}
                          onRefresh={refreshPresetsAndList}
                        />
                      ))}
                      <NewTagForm onRefresh={refreshPresetsAndList} />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {tagPresets.map((p) => {
                        const on = selectedTags.includes(p.slug);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleTag(p.slug)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                              on
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border bg-muted/50 text-muted-foreground hover:border-primary/30"
                            )}
                          >
                            <span>{p.emoji}</span>
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Atalhos de texto */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Textos rápidos
                    </span>
                    {!presetsNeedMigration ? (
                      <button
                        type="button"
                        onClick={() => setEditTemplates((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Pencil className="h-3 w-3" />
                        {editTemplates ? "Concluir" : "Editar atalhos"}
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        Edição após rodar o SQL
                      </span>
                    )}
                  </div>

                  {presetsLoading && !textTemplates.length ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando atalhos…
                    </div>
                  ) : editTemplates ? (
                    <div className="space-y-2">
                      {textTemplates.map((tpl) => (
                        <TemplateEditorRow
                          key={tpl.id}
                          tpl={tpl}
                          onRefresh={refreshPresetsAndList}
                        />
                      ))}
                      <NewTemplateForm onRefresh={refreshPresetsAndList} />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {textTemplates.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() =>
                            setDraft((d) =>
                              d.trim()
                                ? `${d.trim()}\n${tpl.prefix}`
                                : tpl.prefix
                            )
                          }
                          className="rounded-md border border-dashed border-border bg-background/80 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        >
                          + {tpl.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    placeholder="Capture o insight em uma ou duas frases…"
                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {speechSupported ? (
                    <button
                      type="button"
                      onClick={() =>
                        listening ? stopListening() : startListening()
                      }
                      title={listening ? "Parar" : "Ditar por voz"}
                      className={cn(
                        "absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-lg border transition",
                        listening
                          ? "border-red-500/50 bg-red-500/10 text-red-600"
                          : "border-border bg-muted/80 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {listening ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                </div>

                {hint ? (
                  <p className="flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-950 dark:text-amber-100">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    {hint}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || !tagPresets.length}
                    className="inline-flex flex-1 min-w-[8rem] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Salvar insight
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    Fechar
                  </button>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Recentes
                    </h3>
                    <div className="relative ms-auto min-w-[8rem] flex-1 sm:max-w-[200px]">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar…"
                        className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs"
                      />
                    </div>
                    {list.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => void copyAllMarkdown()}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Copiar tudo (MD)
                      </button>
                    ) : null}
                  </div>

                  {listLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Carregando…
                    </div>
                  ) : filteredList.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {list.length === 0
                        ? "Nenhum insight ainda — o primeiro fica aqui."
                        : "Nada encontrado na busca."}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredList.map((it) => (
                        <InsightListCard
                          key={it.id}
                          it={it}
                          tagPresets={tagPresets}
                          onRefresh={refreshPresetsAndList}
                          onTogglePin={(id) => void togglePin(id)}
                          onCopy={(item) => void copyOne(item)}
                          onRemove={(id) => void removeOne(id)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
