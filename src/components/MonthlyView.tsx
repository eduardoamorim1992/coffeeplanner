import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "alta" | "media" | "baixa";
  time?: string | null;
}

interface Props {
  calendarData: Record<string, Task[]>;
  currentMonth: number;
  currentYear: number;
  /** Dia em foco na mini-lista ao lado (YYYY-MM-DD) */
  selectedDate?: string;
  onMonthChange: (offset: number) => void;
  onSelectDate: (date: string) => void;
}

export function MonthlyView({
  calendarData,
  currentMonth,
  currentYear,
  selectedDate,
  onMonthChange,
  onSelectDate,
}: Props) {
  const [tooltip, setTooltip] = useState<{ date: string; rect: DOMRect } | null>(null);
  const hideRef = useRef<number | null>(null);

  const showTooltip = useCallback((date: string, rect: DOMRect) => {
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    setTooltip({ date, rect });
  }, []);

  const hideTooltip = useCallback(() => {
    hideRef.current = window.setTimeout(() => {
      setTooltip(null);
      hideRef.current = null;
    }, 100);
  }, []);

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);

  const startWeekDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: (string | null)[] = [];

  for (let i = 0; i < startWeekDay; i++) {
    days.push(null);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(currentYear, currentMonth, d);
    days.push(formatDateLocal(dateObj));
  }

  function changeMonth(offset: number) {
    setTooltip(null);
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    onMonthChange(offset);
  }

  function getStatus(tasks: Task[]) {
    if (!tasks || tasks.length === 0) return "empty";

    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;

    if (completed === total) return "done";
    if (completed === 0) return "pending";

    return "mixed";
  }

  const weekShort = ["D", "S", "T", "Q", "Q", "S", "S"];
  const weekLong = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return (
    <div className="space-y-2 sm:space-y-4 w-full h-full flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center gap-2 px-1">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            changeMonth(-1);
          }}
          className="min-h-[44px] min-w-[44px] rounded-xl bg-muted hover:bg-primary/20 transition flex items-center justify-center text-lg"
        >
          ◀
        </button>

        <h2 className="text-sm sm:text-lg font-semibold capitalize text-center leading-tight px-1 flex-1">
          {new Date(currentYear, currentMonth).toLocaleString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <button
          type="button"
          aria-label="Próximo mês"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            changeMonth(1);
          }}
          className="min-h-[44px] min-w-[44px] rounded-xl bg-muted hover:bg-primary/20 transition flex items-center justify-center text-lg"
        >
          ▶
        </button>
      </div>

      {/* DIAS DA SEMANA */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 text-center text-[10px] sm:text-xs text-muted-foreground px-0">
        {weekLong.map((day, i) => (
          <div key={day} className="truncate font-medium">
            <span className="sm:hidden">{weekShort[i]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 flex-1 px-0 overflow-visible">

        {days.map((date, index) => {

          if (!date) {
            return <div key={index} className="min-h-[3.5rem] sm:min-h-[5rem]" />;
          }

          const tasks = calendarData[date] || [];

          const high = tasks.filter(
            (t) => t.priority === "alta" && !t.completed
          ).length;

          const medium = tasks.filter(
            (t) => t.priority === "media" && !t.completed
          ).length;

          const low = tasks.filter(
            (t) => t.priority === "baixa" && !t.completed
          ).length;

          const completed = tasks.filter((t) => t.completed).length;
          const pendingTasks = tasks.filter((t) => !t.completed);
          const completedTasks = tasks.filter((t) => t.completed);

          const status = getStatus(tasks);
          const isSelected = selectedDate === date;

          return (
            <button
              type="button"
              key={index}
              onClick={() => onSelectDate(date)}
              onMouseEnter={(e) => tasks.length > 0 && showTooltip(date, e.currentTarget.getBoundingClientRect())}
              onMouseLeave={hideTooltip}
              className={`
                relative group min-h-[3.5rem] sm:min-h-[5rem] border rounded-md sm:rounded-lg p-0.5 sm:p-1.5 text-left cursor-pointer transition-all active:scale-[0.98]
                touch-manipulation

                ${status === "done" && "bg-green-500/20 border-green-500"}
                ${status === "pending" && high > 0 && "bg-red-500/10 border-red-500"}
                ${status === "mixed" && "bg-yellow-500/10 border-yellow-500"}
                ${status === "empty" && !isSelected && "border-border bg-muted/25 dark:border-zinc-700/80 dark:bg-zinc-900/20"}

                ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background z-10" : ""}

                sm:hover:scale-[1.02]
              `}
            >
              <div className="flex justify-between items-start gap-0.5">
                <span className="text-xs sm:text-sm font-semibold tabular-nums">
                  {Number(date.split("-")[2])}
                </span>

                {tasks.length > 0 && (
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground shrink-0">
                    {completed}/{tasks.length}
                  </span>
                )}
              </div>

              <div className="mt-0.5 sm:mt-1 space-y-0.5 text-[10px] sm:text-xs">

                <div className="flex items-center gap-1 flex-wrap">

                  {high > 0 && (
                    <div className="flex items-center gap-0.5 text-red-500">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span>{high}</span>
                    </div>
                  )}

                  {medium > 0 && (
                    <div className="flex items-center gap-0.5 text-blue-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>{medium}</span>
                    </div>
                  )}

                  {low > 0 && (
                    <div className="flex items-center gap-0.5 text-gray-400">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span>{low}</span>
                    </div>
                  )}

                </div>

                {high > 0 && (
                  <div className="hidden text-[10px] font-semibold leading-tight text-red-700 dark:text-red-400 sm:block">
                    Alta prioridade
                  </div>
                )}

                {status === "done" && (
                  <div className="text-[9px] font-semibold leading-tight text-emerald-700 dark:text-green-400 sm:text-[10px]">
                    ✔ Ok
                  </div>
                )}

              </div>

            </button>
          );
        })}
      </div>

      {/* Tooltip via Portal — fora do grid, fundo opaco */}
      {tooltip &&
        createPortal(
          <DayTooltip
            date={tooltip.date}
            rect={tooltip.rect}
            tasks={calendarData[tooltip.date] || []}
            onMouseEnter={() => {
              if (hideRef.current) {
                clearTimeout(hideRef.current);
                hideRef.current = null;
              }
            }}
            onMouseLeave={hideTooltip}
          />,
          document.body
        )}
    </div>
  );
}

function DayTooltip({
  date,
  rect,
  tasks,
  onMouseEnter,
  onMouseLeave,
}: {
  date: string;
  rect: DOMRect;
  tasks: Task[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const completed = completedTasks.length;
  const cardWidth = 320;
  const gap = 8;

  const win = typeof window !== "undefined" ? window : null;
  const spaceBelow = win ? win.innerHeight - rect.bottom - gap : 300;
  const spaceAbove = win ? rect.top - gap : 300;
  const showAbove = spaceBelow < 220 && spaceAbove >= spaceBelow;

  const left = Math.max(
    12,
    Math.min(rect.left, typeof window !== "undefined" ? window.innerWidth - cardWidth - 12 : rect.left)
  );

  const positionStyle = showAbove
    ? { bottom: (win?.innerHeight ?? 800) - rect.top + gap, left }
    : { top: rect.bottom + gap, left };

  return (
    <div
      className="fixed z-[99999] hidden min-h-0 w-[320px] min-w-[280px] max-h-[250px] max-w-[350px] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg animate-fade-in dark:border-zinc-600/50 dark:bg-[#0a0a0b] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] md:flex"
      style={positionStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="shrink-0 border-b border-border px-4 pb-2 pt-4 dark:border-zinc-700/80">
        <span className="text-[11px] leading-relaxed text-muted-foreground">
          {completed}/{tasks.length} concluídas
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3">
        {pendingTasks.map((t) => (
          <div
            key={t.id}
            className="break-words text-[11px] leading-relaxed text-foreground dark:text-zinc-200"
          >
            • {t.time ? <span className="mr-1.5 font-mono text-muted-foreground">{t.time}</span> : ""}
            {t.title}
          </div>
        ))}
        {completedTasks.map((t) => (
          <div
            key={t.id}
            className="break-words text-[11px] leading-relaxed text-muted-foreground line-through dark:text-zinc-500"
          >
            • {t.time ? <span className="mr-1.5 font-mono text-muted-foreground/80 dark:text-zinc-600">{t.time}</span> : ""}
            {t.title}
          </div>
        ))}
      </div>
    </div>
  );
}