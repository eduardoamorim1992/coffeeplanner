import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import {
  sortDayTasks,
  toggleCalendarDayTask,
  type CalendarTask,
} from "@/lib/calendarDayTasks";

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

interface Props {
  isoDate: string;
  calendarData: Record<string, CalendarTask[]>;
  setCalendarData: React.Dispatch<
    React.SetStateAction<Record<string, CalendarTask[]>>
  >;
  onOpenWeek: () => void;
}

const priorityColors = {
  alta: "text-red-700 dark:text-red-500",
  media: "text-sky-700 dark:text-blue-500",
  baixa: "text-slate-500 dark:text-gray-400",
};

const priorityBackground = {
  alta: "bg-red-100/80 dark:bg-red-500/10",
  media: "bg-sky-100/75 dark:bg-blue-500/10",
  baixa: "bg-slate-100/90 dark:bg-gray-500/10",
};

export function MiniDayTaskList({
  isoDate,
  calendarData,
  setCalendarData,
  onOpenWeek,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const todayIso = formatDateLocal(new Date());
  const isToday = isoDate === todayIso;

  const parsed = parseLocalDate(isoDate);
  const longLabel = parsed.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const shortLabel = parsed.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const tasks = sortDayTasks(calendarData[isoDate] || []);
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;

  async function onToggle(taskId: string) {
    if (busyId) return;
    setBusyId(taskId);
    await toggleCalendarDayTask(
      isoDate,
      taskId,
      calendarData,
      setCalendarData
    );
    setBusyId(null);
  }

  return (
    <div className="flex max-h-[min(58vh,480px)] min-h-[140px] flex-col rounded-lg border border-border bg-card/95 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:shadow-none sm:min-h-[160px] sm:max-h-[min(65vh,500px)] sm:rounded-xl md:min-h-[180px] md:max-h-[min(70vh,520px)] lg:sticky lg:top-4">
      <div className="shrink-0 space-y-0.5 border-b border-border px-2.5 py-2 dark:border-zinc-800/80 sm:space-y-1 sm:px-3 sm:py-3 md:px-4">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
              <span className="sm:hidden">Do dia</span>
              <span className="hidden sm:inline">Atividades do dia</span>
            </p>
            <p className="truncate text-xs font-semibold capitalize leading-tight text-foreground sm:hidden dark:text-zinc-100">
              {shortLabel}
            </p>
            <p className="hidden truncate text-sm font-semibold capitalize leading-snug text-foreground sm:block dark:text-zinc-100">
              {longLabel}
            </p>
          </div>
          {isToday ? (
            <span className="shrink-0 rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold text-primary sm:px-2 sm:text-[10px]">
              Hoje
            </span>
          ) : null}
        </div>
        {total > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {done}/{total} concluída{total === 1 ? "" : "s"}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">Nenhuma atividade</p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 sm:px-3 py-2 space-y-1.5">
        {tasks.length === 0 ? (
          <p className="px-0.5 py-1.5 text-[11px] leading-snug text-muted-foreground sm:px-1 sm:py-2 sm:text-xs">
            <span className="sm:hidden">Nada neste dia — toque em outro dia ou em “Ver semana”.</span>
            <span className="hidden sm:inline">
              Sem atividades neste dia. Escolha outro dia no calendário ou abra a visão semanal.
            </span>
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-2 rounded-lg px-2 py-1.5 transition ${
                task.completed
                  ? "bg-emerald-100/85 dark:bg-green-500/15"
                  : priorityBackground[task.priority]
              }`}
            >
              <button
                type="button"
                disabled={busyId === task.id}
                onClick={() => onToggle(task.id)}
                className="flex items-start gap-2 text-left min-w-0 flex-1 disabled:opacity-60"
                title={task.completed ? "Desmarcar" : "Concluir"}
              >
                {task.completed ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 dark:text-green-500 mt-0.5" />
                ) : (
                  <Circle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${priorityColors[task.priority]}`}
                  />
                )}
                <span
                  className={`text-[12px] leading-snug break-words ${
                    task.completed
                      ? "text-muted-foreground line-through"
                      : "text-foreground dark:text-zinc-200"
                  }`}
                >
                  {task.time ? (
                    <span className="mr-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                      {task.time}
                    </span>
                  ) : null}
                  {task.title}
                </span>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-border px-2 py-1.5 dark:border-zinc-800/80 sm:px-3 sm:py-2">
        <button
          type="button"
          onClick={onOpenWeek}
          className="h-9 min-h-9 w-full rounded-lg border border-border bg-muted/40 text-[11px] font-medium text-foreground transition hover:bg-muted active:scale-[0.99] dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-white sm:h-10 sm:min-h-[40px] sm:text-xs"
        >
          <span className="sm:hidden">Ver semana</span>
          <span className="hidden sm:inline">Abrir visão semanal</span>
        </button>
      </div>
    </div>
  );
}
