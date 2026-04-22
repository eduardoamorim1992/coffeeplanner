import { MonthlyView } from "@/components/MonthlyView";
import { WeeklyView } from "@/components/WeeklyView";
import { MiniDayTaskList } from "@/components/MiniDayTaskList";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  CalendarDays,
  CalendarRange,
  Link2,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
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
    <div className="space-y-2 transition-all duration-300 sm:space-y-3 md:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex w-full gap-1 rounded-xl border border-border bg-card/90 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:shadow-[0_8px_24px_-18px_rgba(0,0,0,0.8)] sm:w-auto sm:gap-1.5 sm:rounded-2xl sm:p-1.5">
          <button
            type="button"
            onClick={() => setCalendarMode("month")}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:min-h-[44px] sm:flex-none sm:rounded-xl sm:px-5 sm:py-2 sm:text-sm ${
              calendarMode === "month"
                ? "bg-gradient-to-r from-primary to-red-500 text-primary-foreground shadow-md ring-1 ring-primary/25 dark:shadow-[0_10px_24px_-12px_rgba(239,68,68,0.7)] dark:ring-red-300/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-white"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setCalendarMode("week")}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:min-h-[44px] sm:flex-none sm:rounded-xl sm:px-5 sm:py-2 sm:text-sm ${
              calendarMode === "week"
                ? "bg-gradient-to-r from-primary to-red-500 text-primary-foreground shadow-md ring-1 ring-primary/25 dark:shadow-[0_10px_24px_-12px_rgba(239,68,68,0.7)] dark:ring-red-300/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-white"
            }`}
          >
            <CalendarRange className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
            Semana
          </button>
        </div>

        <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
          {canReplicate && (
            <ActionButton
              onClick={() => onReplicateMonth(viewYear, viewMonth)}
              disabled={loadingReplicate}
              variant="primary"
              className="w-full sm:w-auto"
              icon={
                loadingReplicate ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )
              }
            >
              {loadingReplicate ? (
                "Copiando..."
              ) : (
                <>
                  <span className="sm:hidden">Próximo mês</span>
                  <span className="hidden sm:inline">Replicar p/ próximo mês</span>
                </>
              )}
            </ActionButton>
          )}
          {onSyncIcs && onIcsUrlChange ? (
            <ActionButton
              onClick={() => setIcsPanelOpen((v) => !v)}
              aria-expanded={icsPanelOpen}
              variant={icsPanelOpen ? "accent" : "secondary"}
              className="w-full sm:w-auto"
              icon={
                icsPanelOpen ? (
                  <X className="h-4 w-4" aria-hidden />
                ) : (
                  <Link2 className="h-4 w-4" aria-hidden />
                )
              }
            >
              <span className="sm:hidden">
                {icsPanelOpen ? "Fechar ICS" : "ICS"}
              </span>
              <span className="hidden sm:inline">
                {icsPanelOpen
                  ? "Fechar importação ICS"
                  : "Importar calendário (ICS)"}
              </span>
            </ActionButton>
          ) : null}
        </div>
      </div>

      {onSyncIcs && onIcsUrlChange && icsPanelOpen ? (
        <div className="space-y-2 rounded-lg border border-teal-200/80 bg-teal-50/40 p-2.5 animate-in fade-in duration-200 dark:border-teal-900/50 dark:bg-zinc-950/60 sm:space-y-3 sm:rounded-xl sm:p-4">
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
            <ActionButton
              onClick={onSyncIcs}
              disabled={syncingIcs || !icsUrl.trim()}
              variant="accent"
              size="md"
              className="shrink-0"
              icon={
                syncingIcs ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )
              }
            >
              {syncingIcs ? "Importando..." : "Sincronizar agora"}
            </ActionButton>
          </div>
        </div>
      ) : null}

      {calendarMode === "month" ? (
        <div className="flex w-full min-w-0 flex-col gap-2 sm:gap-3 lg:flex-row lg:gap-5 lg:items-start">
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
            setSelectedDate={setSelectedDate}
          />
        </div>
      )}
    </div>
  );
}
