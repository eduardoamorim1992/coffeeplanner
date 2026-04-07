import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { CalendarTask } from "@/lib/calendarDayTasks";

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Ordem Seg → Dom (igual à grade semanal) */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const WEEKDAY_LABEL: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

type WeekDayColumn = {
  date: string;
  tasks: unknown[];
};

type Props = {
  task: CalendarTask;
  sourceDate: string;
  /** Colunas da semana atual (para o preset “dias com atividades”) */
  week: WeekDayColumn[];
  onClose: () => void;
  onConfirm: (weekdays: Set<number>) => void;
};

export function ReplicateTaskDialog({
  task,
  sourceDate,
  week,
  onClose,
  onConfirm,
}: Props) {
  const sourceDow = useMemo(
    () => parseLocalDate(sourceDate).getDay(),
    [sourceDate]
  );

  const [selected, setSelected] = useState<Set<number>>(
    () => new Set([sourceDow])
  );

  const monthLabel = useMemo(() => {
    const d = parseLocalDate(sourceDate);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [sourceDate]);

  const busyWeekdays = useMemo(() => {
    const s = new Set<number>();
    for (const col of week) {
      if ((col.tasks?.length ?? 0) > 0) {
        s.add(parseLocalDate(col.date).getDay());
      }
    }
    return s;
  }, [week]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleDay = useCallback((dow: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dow)) next.delete(dow);
      else next.add(dow);
      return next;
    });
  }, []);

  const applyPreset = useCallback((days: Set<number>) => {
    setSelected(new Set(days));
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] dark:bg-black/60"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="replicate-task-title"
        className="relative flex max-h-[min(92vh,640px)] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card text-card-foreground shadow-[0_-12px_40px_rgba(15,23,42,0.12)] animate-in fade-in duration-200 dark:border-zinc-700/90 dark:bg-zinc-950 dark:shadow-[0_-8px_40px_rgba(0,0,0,0.45)] sm:max-w-md sm:rounded-3xl sm:shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 pb-3 pt-5 dark:border-zinc-800/90">
          <div className="min-w-0 space-y-1">
            <p
              id="replicate-task-title"
              className="text-sm font-semibold leading-snug text-foreground dark:text-zinc-100"
            >
              Replicar atividade
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              No mês de{" "}
              <span className="font-medium capitalize text-foreground dark:text-zinc-300">
                {monthLabel}
              </span>
              , criar a mesma tarefa em todos os dias que coincidirem com os
              dias da semana marcados abaixo.
            </p>
            <div className="mt-2 rounded-xl border border-border bg-muted/40 px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-900/50">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Tarefa
              </p>
              <p className="mt-0.5 break-words text-sm text-foreground dark:text-zinc-100">
                {task.time ? (
                  <span className="mr-1.5 font-mono tabular-nums text-muted-foreground dark:text-zinc-400">
                    {task.time}
                  </span>
                ) : null}
                {task.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground dark:text-zinc-500 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200"
            aria-label="Fechar diálogo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Atalhos
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset(busyWeekdays)}
                disabled={busyWeekdays.size === 0}
                className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-200/90 disabled:pointer-events-none disabled:opacity-40 dark:border-violet-500/40 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-900/50 transition active:scale-[0.98]"
              >
                Dias com atividades (esta semana)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(new Set([1, 2, 3, 4, 5]))}
                className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted dark:border-zinc-600/80 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800/90 transition active:scale-[0.98]"
              >
                Segunda a sexta
              </button>
              <button
                type="button"
                onClick={() => applyPreset(new Set([0, 1, 2, 3, 4, 5, 6]))}
                className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted dark:border-zinc-600/80 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800/90 transition active:scale-[0.98]"
              >
                Toda a semana
              </button>
              <button
                type="button"
                onClick={() => applyPreset(new Set([sourceDow]))}
                className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted dark:border-zinc-600/80 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800/90 transition active:scale-[0.98]"
              >
                Só o mesmo dia da semana
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Dias da semana
            </p>
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAY_ORDER.map((dow) => {
                const on = selected.has(dow);
                const isSource = dow === sourceDow;
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleDay(dow)}
                    className={`relative min-h-[44px] rounded-xl text-xs font-semibold transition active:scale-[0.97] ${
                      on
                        ? "bg-gradient-to-br from-primary to-red-600 text-primary-foreground shadow-md ring-1 ring-primary/25 dark:shadow-red-900/30 dark:ring-red-400/25"
                        : "border border-border bg-muted/50 text-muted-foreground hover:border-primary/25 hover:text-foreground dark:border-zinc-700/90 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
                    }`}
                    aria-pressed={on}
                    aria-label={`${WEEKDAY_LABEL[dow]}${on ? ", selecionado" : ""}`}
                  >
                    {WEEKDAY_LABEL[dow]}
                    {isSource ? (
                      <span
                        className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500/90 px-0.5 text-[7px] font-bold uppercase tracking-tight text-zinc-950"
                        title="Dia da semana desta tarefa"
                      >
                        base
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              O dia de origem não será duplicado. Combinações que já existirem
              (mesma data, hora e título) são ignoradas.
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border bg-muted/30 px-5 py-4 dark:border-zinc-800/90 dark:bg-zinc-950/80">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition hover:bg-muted active:scale-[0.99] dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => onConfirm(selected)}
            className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-primary to-red-600 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-95 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 dark:shadow-lg dark:shadow-red-900/25"
          >
            Replicar
          </button>
        </div>
      </div>
    </div>
  );
}
