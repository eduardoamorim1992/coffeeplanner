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

  // Espaços vazios antes do início do mês
  for (let i = 0; i < startWeekDay; i++) {
    days.push(null);
  }

  // Dias do mês
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
          const tasksCount = tasks.length;

          const hasHighPriority = tasks.some(
            (task) =>
              task.priority === "alta" && !task.completed
          );

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

              {/* Indicador quantidade de tarefas */}
              {tasksCount > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-xs">
                    {tasksCount}
                  </span>
                </div>
              )}

              {/* Alta prioridade */}
              {hasHighPriority && (
                <div className="mt-1 text-[10px] text-red-400 font-semibold">
                  Alta prioridade
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}