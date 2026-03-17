import { useEffect, useState } from "react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  time?: string;
  priority: "alta" | "media" | "baixa";
}

interface Props {
  calendarData: Record<string, Task[]>;
}

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Dashboard({ calendarData }: Props) {

  const [stats, setStats] = useState({
    todayDone: 0,
    todayPending: 0,
    overdue: 0,
    weekTotal: 0
  });

  useEffect(() => {

    const today = new Date();
    const todayStr = formatDateLocal(today);

    let todayDone = 0;
    let todayPending = 0;
    let overdue = 0;
    let weekTotal = 0;

    const now = new Date();

    Object.entries(calendarData).forEach(([date, tasks]) => {

      tasks.forEach((task) => {

        // Hoje
        if (date === todayStr) {
          if (task.completed) todayDone++;
          else todayPending++;
        }

        // Semana
        const taskDate = new Date(date);
        const diffDays = (taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays >= -7 && diffDays <= 7) {
          weekTotal++;
        }

        // Atrasadas
        if (!task.completed && task.time) {

          const [h, m] = task.time.split(":").map(Number);

          const taskDateTime = new Date(date);
          taskDateTime.setHours(h);
          taskDateTime.setMinutes(m);

          if (taskDateTime < now) {
            overdue++;
          }

        }

      });

    });

    setStats({
      todayDone,
      todayPending,
      overdue,
      weekTotal
    });

  }, [calendarData]);

  const totalToday = stats.todayDone + stats.todayPending;
  const progress =
    totalToday > 0
      ? Math.round((stats.todayDone / totalToday) * 100)
      : 0;

  return (
    <div className="space-y-6">

      {/* CARDS */}
      <div className="grid grid-cols-4 gap-4">

        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Concluídas Hoje</p>
          <p className="text-2xl font-bold text-green-500">
            {stats.todayDone}
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Pendentes Hoje</p>
          <p className="text-2xl font-bold text-yellow-400">
            {stats.todayPending}
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Atrasadas</p>
          <p className="text-2xl font-bold text-red-500">
            {stats.overdue}
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Total Semana</p>
          <p className="text-2xl font-bold text-blue-400">
            {stats.weekTotal}
          </p>
        </div>

      </div>

      {/* PROGRESSO */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-semibold">
          Progresso do Dia: {progress}%
        </p>

        <div className="w-full h-2 bg-muted/40 rounded overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* LISTA DE ATRASADAS */}
      <div className="glass-card p-4">
        <p className="text-sm font-semibold mb-2">
          🔴 Tarefas Atrasadas
        </p>

        <div className="space-y-1 text-xs">

          {Object.entries(calendarData).map(([date, tasks]) =>
            tasks
              .filter((t) => !t.completed)
              .map((task) => {

                const now = new Date();

                if (!task.time) return null;

                const [h, m] = task.time.split(":").map(Number);

                const taskDateTime = new Date(date);
                taskDateTime.setHours(h);
                taskDateTime.setMinutes(m);

                if (taskDateTime < now) {

                  return (
                    <div key={task.id} className="text-red-400">
                      {task.time} - {task.title}
                    </div>
                  );

                }

                return null;

              })
          )}

        </div>
      </div>

    </div>
  );
}