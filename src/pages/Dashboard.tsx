import { useEffect, useState } from "react";
import { divisions } from "@/data/mockData";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";

interface Task {
  completed: boolean;
  priority: "alta" | "media" | "baixa";
}

export default function Dashboard() {
  const [globalData, setGlobalData] = useState<
    Record<string, Record<string, Task[]>>
  >({});

  useEffect(() => {
    const data: Record<string, Record<string, Task[]>> =
      {};

    divisions.forEach((division) => {
      const saved = localStorage.getItem(
        `division-calendar-${division.id}`
      );

      data[division.id] = saved
        ? JSON.parse(saved)
        : {};
    });

    setGlobalData(data);
  }, []);

  // =============================
  // 🔢 CÁLCULO GLOBAL
  // =============================

  let totalTasks = 0;
  let completedTasks = 0;
  let highPriorityPending = 0;

  Object.values(globalData).forEach((calendar) => {
    Object.values(calendar).forEach((tasks) => {
      tasks.forEach((task) => {
        totalTasks++;
        if (task.completed) completedTasks++;
        if (
          task.priority === "alta" &&
          !task.completed
        )
          highPriorityPending++;
      });
    });
  });

  const globalRate =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

  // =============================
  // 🏆 RANKING
  // =============================

  const ranking = divisions.map((division) => {
    const calendar =
      globalData[division.id] || {};

    let total = 0;
    let completed = 0;

    Object.values(calendar).forEach((tasks) => {
      tasks.forEach((task) => {
        total++;
        if (task.completed) completed++;
      });
    });

    const rate =
      total > 0
        ? Math.round((completed / total) * 100)
        : 0;

    return {
      name: division.name,
      rate,
    };
  });

  ranking.sort((a, b) => b.rate - a.rate);

  // =============================
  // 🚨 ALERTAS
  // =============================

  const alerts: string[] = [];

  Object.entries(globalData).forEach(
    ([divisionId, calendar]) => {
      Object.entries(calendar).forEach(
        ([date, tasks]) => {
          tasks.forEach((task) => {
            if (
              task.priority === "alta" &&
              !task.completed
            ) {
              alerts.push(
                `Alta prioridade pendente em ${divisionId} (${date})`
              );
            }
          });
        }
      );
    }
  );

  // =============================
  // UI
  // =============================

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader divisionName="Dashboard Executivo" />

        <main className="flex-1 overflow-y-auto p-8 space-y-8">

          {/* RESUMO GLOBAL */}
          <div className="grid grid-cols-4 gap-6">
            <Card
              title="Total de Tarefas"
              value={totalTasks}
            />
            <Card
              title="Concluídas"
              value={completedTasks}
            />
            <Card
              title="Taxa Global"
              value={`${globalRate}%`}
              highlight
            />
            <Card
              title="Alta Prioridade Pendente"
              value={highPriorityPending}
              danger
            />
          </div>

          <div className="grid grid-cols-2 gap-8">

            {/* RANKING */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg">
              <h3 className="text-white font-semibold mb-4">
                🏆 Ranking por Divisão
              </h3>

              <div className="space-y-3">
                {ranking.map((division, index) => (
                  <div
                    key={division.name}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-zinc-300">
                      {index + 1}. {division.name}
                    </span>

                    <span
                      className={`font-semibold ${
                        division.rate >= 70
                          ? "text-green-400"
                          : division.rate >= 40
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {division.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ALERTAS */}
            <div className="bg-zinc-900 border border-red-500 rounded-xl p-6 shadow-lg">
              <h3 className="text-red-400 font-semibold mb-4">
                🚨 Alertas Inteligentes
              </h3>

              {alerts.length === 0 ? (
                <p className="text-green-400 text-sm">
                  Nenhum alerta no momento.
                </p>
              ) : (
                <div className="space-y-2 text-sm text-zinc-300 max-h-60 overflow-auto">
                  {alerts.slice(0, 10).map(
                    (alert, i) => (
                      <div key={i}>• {alert}</div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// =============================
// 🔹 CARD COMPONENT
// =============================

function Card({
  title,
  value,
  highlight,
  danger,
}: {
  title: string;
  value: string | number;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg text-center">
      <p className="text-sm text-zinc-400">
        {title}
      </p>

      <p
        className={`text-2xl font-bold mt-2 ${
          highlight
            ? "text-green-400"
            : danger
            ? "text-red-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}