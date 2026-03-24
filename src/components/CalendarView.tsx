import { MonthlyView } from "@/components/MonthlyView";
import { WeeklyView } from "@/components/WeeklyView";
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
  onReplicateMonth: () => void;
  canReplicate: boolean;
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
}: CalendarViewProps) {
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month");
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewYear, viewMonth + offset, 1);
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  return (
    <div className="space-y-3 sm:space-y-4 transition-all duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full sm:w-auto bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-1.5 gap-1.5 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.8)]">
          <button
            type="button"
            onClick={() => setCalendarMode("month")}
            className={`flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              calendarMode === "month"
                ? "bg-gradient-to-r from-primary to-red-500 text-white shadow-[0_10px_24px_-12px_rgba(239,68,68,0.7)] ring-1 ring-red-300/30"
                : "text-zinc-300 hover:text-white hover:bg-zinc-800/70"
            }`}
          >
            📅 Mensal
          </button>
          <button
            type="button"
            onClick={() => setCalendarMode("week")}
            className={`flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              calendarMode === "week"
                ? "bg-gradient-to-r from-primary to-red-500 text-white shadow-[0_10px_24px_-12px_rgba(239,68,68,0.7)] ring-1 ring-red-300/30"
                : "text-zinc-300 hover:text-white hover:bg-zinc-800/70"
            }`}
          >
            📆 Semana
          </button>
        </div>

        {canReplicate && (
          <button
            type="button"
            onClick={onReplicateMonth}
            disabled={loadingReplicate}
            className="w-full sm:w-auto min-h-[44px] bg-blue-600 px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 active:scale-[0.98] transition"
          >
            {loadingReplicate ? "Copiando..." : "🔁 Replicar mês"}
          </button>
        )}
      </div>

      {calendarMode === "month" ? (
        <div className="w-full">
          <MonthlyView
            calendarData={calendarData}
            currentMonth={viewMonth}
            currentYear={viewYear}
            onMonthChange={changeMonth}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setCalendarMode("week");
            }}
          />
        </div>
      ) : (
        <div className="w-full">
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
