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

  const weekShort = ["D", "S", "T", "Q", "Q", "S", "S"];
  const weekLong = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return (
    <div className="space-y-3 sm:space-y-6 w-full h-full flex flex-col -mx-1 sm:mx-0">

      {/* HEADER */}
      <div className="flex justify-between items-center gap-2 px-1">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => changeMonth(-1)}
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
          onClick={() => changeMonth(1)}
          className="min-h-[44px] min-w-[44px] rounded-xl bg-muted hover:bg-primary/20 transition flex items-center justify-center text-lg"
        >
          ▶
        </button>
      </div>

      {/* DIAS DA SEMANA */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs text-muted-foreground px-0.5">
        {weekLong.map((day, i) => (
          <div key={day} className="truncate font-medium">
            <span className="sm:hidden">{weekShort[i]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 px-0.5">

        {days.map((date, index) => {

          if (!date) {
            return <div key={index} className="min-h-[4.5rem] sm:h-24" />;
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
            <button
              type="button"
              key={index}
              onClick={() => onSelectDate(date)}
              className={`
                min-h-[4.5rem] sm:min-h-[6rem] border rounded-md sm:rounded-lg p-1 sm:p-2 text-left cursor-pointer transition-all active:scale-[0.98]
                touch-manipulation

                ${status === "done" && "bg-green-500/20 border-green-500"}
                ${status === "pending" && high > 0 && "bg-red-500/10 border-red-500"}
                ${status === "mixed" && "bg-yellow-500/10 border-yellow-500"}

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
                  <div className="hidden sm:block text-[10px] text-red-400 font-semibold leading-tight">
                    Alta prioridade
                  </div>
                )}

                {status === "done" && (
                  <div className="text-[9px] sm:text-[10px] text-green-400 font-semibold leading-tight">
                    ✔ Ok
                  </div>
                )}

              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}