import { useState } from "react";

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
}

interface Props {
  calendarData: Record<string, Task[]>;
  onSelectDate: (date: string) => void;
}

export function MonthlyView({ calendarData, onSelectDate }: Props) {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    today.getMonth()
  );
  const [currentYear, setCurrentYear] = useState(
    today.getFullYear()
  );

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
    const newDate = new Date(
      currentYear,
      currentMonth + offset,
      1
    );
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  }

  return (
    <div className="space-y-6 max-w-4xl ml-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => changeMonth(-1)}
          className="px-3 py-1 rounded bg-muted hover:bg-primary/20 transition"
        >
          ◀
        </button>

        <h2 className="text-lg font-semibold capitalize">
          {new Date(currentYear, currentMonth).toLocaleString(
            "pt-BR",
            {
              month: "long",
              year: "numeric",
            }
          )}
        </h2>

        <button
          onClick={() => changeMonth(1)}
          className="px-3 py-1 rounded bg-muted hover:bg-primary/20 transition"
        >
          ▶
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-3 text-center text-xs text-muted-foreground">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map(
          (day) => (
            <div key={day}>{day}</div>
          )
        )}
      </div>

      {/* Grid calendário */}
      <div className="grid grid-cols-7 gap-3">
        {days.map((date, index) => {
          if (!date) {
            return (
              <div
                key={index}
                className="h-24 border-transparent"
              />
            );
          }

          const tasks = calendarData[date] || [];

          // 🔥 Contagem por prioridade (somente pendentes)
          const high = tasks.filter(
            (task) =>
              task.priority === "alta" &&
              !task.completed
          ).length;

          const medium = tasks.filter(
            (task) =>
              task.priority === "media" &&
              !task.completed
          ).length;

          const low = tasks.filter(
            (task) =>
              task.priority === "baixa" &&
              !task.completed
          ).length;

          const hasHighPriority = high > 0;

          return (
            <div
              key={index}
              className={`h-24 border rounded-lg p-2 cursor-pointer transition
                ${
                  hasHighPriority
                    ? "border-red-500 bg-red-500/10"
                    : "hover:border-primary hover:bg-muted/20"
                }`}
              onClick={() => onSelectDate(date)}
            >
              {/* Número do dia */}
              <div className="text-sm font-semibold">
                {Number(date.split("-")[2])}
              </div>

              {/* Indicadores */}
              {(high > 0 || medium > 0 || low > 0) && (
                <div className="mt-2 space-y-1 text-xs">

                  {/* Linha das quantidades */}
                  <div className="flex items-center gap-3">
                    
                    {high > 0 && (
                      <div className="flex items-center gap-1 text-red-500">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span>{high}</span>
                      </div>
                    )}

                    {medium > 0 && (
                      <div className="flex items-center gap-1 text-blue-500">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span>{medium}</span>
                      </div>
                    )}

                    {low > 0 && (
                      <div className="flex items-center gap-1 text-gray-400">
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        <span>{low}</span>
                      </div>
                    )}

                  </div>

                  {/* Texto apenas se houver alta */}
                  {high > 0 && (
                    <div className="text-[10px] text-red-400 font-semibold">
                      Alta prioridade
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}