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

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

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
    const newDate = new Date(currentYear, currentMonth + offset, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  }

  function getStatus(tasks: Task[]) {
    if (!tasks || tasks.length === 0) return "empty";

    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;

    if (completed === total) return "done";
    if (completed === 0) return "pending";

    return "mixed";
  }

  return (
    <div className="space-y-6 max-w-4xl ml-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => changeMonth(-1)}
          className="px-3 py-1 rounded bg-muted hover:bg-primary/20 transition"
        >
          ◀
        </button>

        <h2 className="text-lg font-semibold capitalize">
          {new Date(currentYear, currentMonth).toLocaleString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <button
          onClick={() => changeMonth(1)}
          className="px-3 py-1 rounded bg-muted hover:bg-primary/20 transition"
        >
          ▶
        </button>
      </div>

      {/* DIAS DA SEMANA */}
      <div className="grid grid-cols-7 gap-3 text-center text-xs text-muted-foreground">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-7 gap-3">
        {days.map((date, index) => {

          if (!date) {
            return <div key={index} className="h-24 border-transparent" />;
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

          const status = getStatus(tasks);

          return (
            <div
              key={index}
              onClick={() => onSelectDate(date)}
              className={`
                h-24 border rounded-lg p-2 cursor-pointer transition-all

                ${status === "done" && "bg-green-500/20 border-green-500"}
                ${status === "pending" && high > 0 && "bg-red-500/10 border-red-500"}
                ${status === "mixed" && "bg-yellow-500/10 border-yellow-500"}

                hover:scale-[1.02]
              `}
            >
              {/* DIA + CONTADOR */}
              <div className="flex justify-between items-start">
                <span className="text-sm font-semibold">
                  {Number(date.split("-")[2])}
                </span>

                {tasks.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {completed}/{tasks.length}
                  </span>
                )}
              </div>

              {/* INDICADORES */}
              <div className="mt-1 space-y-0.5 text-xs">

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

                {/* TEXTO */}
                {high > 0 && (
                  <div className="text-[10px] text-red-400 font-semibold">
                    Alta prioridade
                  </div>
                )}

                {/* CONCLUÍDO */}
                {status === "done" && (
                  <div className="text-[10px] text-green-400 font-semibold">
                    ✔ Concluído
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}