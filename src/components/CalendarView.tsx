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

  return (
    <div className="space-y-3 sm:space-y-4 transition-all duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full sm:w-auto bg-muted/30 border rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setCalendarMode("month")}
            className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition ${
              calendarMode === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            📅 Mensal
          </button>
          <button
            type="button"
            onClick={() => setCalendarMode("week")}
            className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition ${
              calendarMode === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
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
