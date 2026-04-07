import { MonthlyView } from "@/components/MonthlyView";
import { WeeklyView } from "@/components/WeeklyView";
import { MiniDayTaskList } from "@/components/MiniDayTaskList";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

interface Task {
  id: string;
  title: string;
  time?: string;
  completed: boolean;
  priority: "alta" | "media" | "baixa";
}

interface CalendarViewProps {
  calendarData: Record<string, Task[]>;
  setCalendarData: Dispatch<SetStateAction<Record<string, Task[]>>>;
  selectedDate: string;
  setSelectedDate: Dispatch<SetStateAction<string>>;
  loadingReplicate: boolean;
  /** Mês de origem (0–11) = mês visível no calendário; réplicas vão para o mês seguinte. */
  onReplicateMonth: (sourceYear: number, sourceMonthIndex: number) => void;
  canReplicate: boolean;
  icsUrl?: string;
  onIcsUrlChange?: (value: string) => void;
  syncingIcs?: boolean;
  onSyncIcs?: () => void;
}

const today = new Date();

export function CalendarView({
  calendarData,
  setCalendarData,
  selectedDate,
  setSelectedDate,
  loadingReplicate,
  onReplicateMonth,
  canReplicate,
  icsUrl = "",
  onIcsUrlChange,
  syncingIcs = false,
  onSyncIcs,
}: CalendarViewProps) {
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month");
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [icsPanelOpen, setIcsPanelOpen] = useState(false);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewYear, viewMonth + offset, 1);
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  return (
    <div className="space-y-3 sm:space-y-4 transition-all duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full sm:w-auto rounded-2xl border border-border bg-card/90 p-1.5 gap-1.5 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:shadow-[0_8px_24px_-18px_rgba(0,0,0,0.8)]">
          <button
            type="button"
            onClick={() => setCalendarMode("month")}
            className={`flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              calendarMode === "month"
                ? "bg-gradient-to-r from-primary to-red-500 text-primary-foreground shadow-md ring-1 ring-primary/25 dark:shadow-[0_10px_24px_-12px_rgba(239,68,68,0.7)] dark:ring-red-300/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-white"
            }`}
          >
            📅 Mensal
          </button>
          <button
            type="button"
            onClick={() => setCalendarMode("week")}
            className={`flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              calendarMode === "week"
                ? "bg-gradient-to-r from-primary to-red-500 text-primary-foreground shadow-md ring-1 ring-primary/25 dark:shadow-[0_10px_24px_-12px_rgba(239,68,68,0.7)] dark:ring-red-300/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-white"
            }`}
          >
            📆 Semana
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-wrap sm:justify-end">
          {canReplicate && (
            <button
              type="button"
              onClick={() => onReplicateMonth(viewYear, viewMonth)}
              disabled={loadingReplicate}
              className="w-full sm:w-auto min-h-[44px] rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60 active:scale-[0.98] transition dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {loadingReplicate ? "Copiando..." : "🔁 Replicar p/ próximo mês"}
            </button>
          )}
          {onSyncIcs && onIcsUrlChange ? (
            <button
              type="button"
              onClick={() => setIcsPanelOpen((v) => !v)}
              aria-expanded={icsPanelOpen}
              className={`w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border transition active:scale-[0.98] ${
                icsPanelOpen
                  ? "border-teal-600/50 bg-teal-50 text-teal-900 dark:border-teal-500/50 dark:bg-teal-950/80 dark:text-teal-100"
                  : "border-border bg-muted/50 text-foreground hover:bg-muted dark:border-zinc-700/80 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800/90"
              }`}
            >
              {icsPanelOpen ? "▼ Fechar importação ICS" : "🔗 Importar calendário (ICS)"}
            </button>
          ) : null}
        </div>
      </div>

      {onSyncIcs && onIcsUrlChange && icsPanelOpen ? (
        <div className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-3 sm:p-4 space-y-3 animate-in fade-in duration-200 dark:border-teal-900/50 dark:bg-zinc-950/60">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground dark:text-zinc-100">
              Link do calendário (.ics)
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed dark:text-zinc-500">
              Cole o link de assinatura do Outlook ou Google. O endereço fica
              salvo neste navegador.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
            <input
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://..."
              value={icsUrl}
              onChange={(e) => onIcsUrlChange(e.target.value)}
              className="flex-1 min-h-[44px] px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-sm"
            />
            <button
              type="button"
              onClick={onSyncIcs}
              disabled={syncingIcs || !icsUrl.trim()}
              className="min-h-[44px] shrink-0 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-500 disabled:opacity-50 active:scale-[0.98] transition"
            >
              {syncingIcs ? "Importando..." : "↻ Sincronizar agora"}
            </button>
          </div>
        </div>
      ) : null}

      {calendarMode === "month" ? (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 w-full min-w-0 lg:items-start">
          <div className="w-full max-w-4xl shrink-0">
            <MonthlyView
              calendarData={calendarData}
              currentMonth={viewMonth}
              currentYear={viewYear}
              selectedDate={selectedDate}
              onMonthChange={changeMonth}
              onSelectDate={(date) => {
                setSelectedDate(date);
              }}
            />
          </div>
          <div className="w-full lg:flex-1 lg:min-w-0 lg:max-w-md xl:max-w-lg">
            <MiniDayTaskList
              isoDate={selectedDate}
              calendarData={calendarData}
              setCalendarData={setCalendarData}
              onOpenWeek={() => setCalendarMode("week")}
            />
          </div>
        </div>
      ) : (
        <div className="w-full min-w-0">
          <WeeklyView
            calendarData={calendarData}
            setCalendarData={setCalendarData}
            selectedDate={selectedDate}
          />
        </div>
      )}
    </div>
  );
}
