import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Drawer } from "vaul";
import {
  Copy,
  Lightbulb,
  Mic,
  MicOff,
  Pin,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  INSIGHT_TAG_PRESETS,
  insightSmartHint,
  loadInsights,
  saveInsights,
  storageKeyForUser,
  type QuickInsight,
  type QuickInsightTag,
} from "@/lib/quickInsights";
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
  /** Onde o usuário está no app (ex.: nome da divisão ou "Dashboard"). */
  contextLabel: string;
  /** Eleva o botão no mobile quando há barra inferior fixa (ex.: abas do calendário). */
  reserveMobileNav?: boolean;
};

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

const TEMPLATES = [
  { label: "Lembrete", prefix: "Lembrete: " },
  { label: "Revisar com equipe", prefix: "Revisar com a equipe: " },
  { label: "Métrica", prefix: "Métrica a acompanhar: " },
  { label: "Decisão", prefix: "Decisão tomada: " },
] as const;

export function QuickInsightCapture({
  contextLabel,
  reserveMobileNav = false,
}: QuickInsightCaptureProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [storageKey, setStorageKey] = useState(() =>
    storageKeyForUser(undefined)
  );
  const [list, setList] = useState<QuickInsight[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedTags, setSelectedTags] = useState<QuickInsightTag[]>([
    "ideia",
  ]);
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void; start: () => void } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      setStorageKey(storageKeyForUser(uid));
    });
  }, []);

  useEffect(() => {
    setList(loadInsights(storageKey));
  }, [storageKey, open]);

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

  const persist = useCallback(
    (next: QuickInsight[]) => {
      const stored = saveInsights(storageKey, next);
      setList(stored);
    },
    [storageKey]
  );

  const toggleTag = (id: QuickInsightTag) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    const text = draft.trim();
    if (!text) {
      toast.message("Escreva algo antes de salvar", {
        description: "Uma frase já basta para não perder o insight.",
      });
      return;
    }
    const entry: QuickInsight = {
      id: newId(),
      text,
      tags: selectedTags.length ? [...selectedTags] : ["ideia"],
      contextLabel,
      route: location.pathname,
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    persist([entry, ...list]);
    setDraft("");
    setSelectedTags(["ideia"]);
    toast.success("Insight guardado", {
      description: "Fica só no seu navegador, ligado à sua conta.",
    });
    textareaRef.current?.focus();
  };

  const removeOne = (id: string) => {
    persist(list.filter((x) => x.id !== id));
    toast.message("Removido");
  };

  const togglePin = (id: string) => {
    persist(
      list.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x))
    );
  };

  const copyOne = async (it: QuickInsight) => {
    const tagStr = it.tags
      .map((t) => INSIGHT_TAG_PRESETS.find((p) => p.id === t)?.label ?? t)
      .join(", ");
    const block = `**${it.contextLabel}** (${it.route})\n${tagStr}\n${it.text}\n_${new Date(it.createdAt).toLocaleString("pt-BR")}_`;
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
        const tags = it.tags.join(", ");
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
    rec.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
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
                <div className="flex flex-wrap gap-1.5">
                  {INSIGHT_TAG_PRESETS.map((p) => {
                    const on = selectedTags.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleTag(p.id)}
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

                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() =>
                        setDraft((d) =>
                          d.trim() ? `${d.trim()}\n${tpl.prefix}` : tpl.prefix
                        )
                      }
                      className="rounded-md border border-dashed border-border bg-background/80 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    >
                      + {tpl.label}
                    </button>
                  ))}
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
                    onClick={handleSave}
                    className="inline-flex flex-1 min-w-[8rem] items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 active:scale-[0.99]"
                  >
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

                  {filteredList.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {list.length === 0
                        ? "Nenhum insight ainda — o primeiro fica aqui."
                        : "Nada encontrado na busca."}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredList.map((it) => (
                        <li
                          key={it.id}
                          className="rounded-xl border border-border bg-muted/30 p-3 text-sm"
                        >
                          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="font-medium text-foreground/80">
                              {it.contextLabel}
                            </span>
                            <span>·</span>
                            <span>{it.route}</span>
                            <span>·</span>
                            <time dateTime={it.createdAt}>
                              {new Date(it.createdAt).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </div>
                          <p className="leading-relaxed text-foreground">
                            {it.text}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {it.tags.map((tid) => {
                              const p = INSIGHT_TAG_PRESETS.find(
                                (x) => x.id === tid
                              );
                              return (
                                <span
                                  key={tid}
                                  className="rounded-md bg-background/80 px-1.5 py-px text-[10px] text-muted-foreground"
                                >
                                  {p?.emoji} {p?.label ?? tid}
                                </span>
                              );
                            })}
                          </div>
                          <div className="mt-2 flex gap-1">
                            <button
                              type="button"
                              onClick={() => togglePin(it.id)}
                              className={cn(
                                "rounded-lg p-1.5 text-muted-foreground hover:bg-muted",
                                it.pinned && "text-amber-600"
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
                              onClick={() => void copyOne(it)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                              title="Copiar"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeOne(it.id)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
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
