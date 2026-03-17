import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import { useState } from "react";

interface Task {
  completed: boolean;
}

interface Props {
  calendarData: Record<string, Task[]>;
}

export function MonthlyChart({ calendarData }: Props) {

  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(
    now.getMonth() + 1
  );

  const [selectedYear, setSelectedYear] = useState(
    now.getFullYear()
  );

  // 🔥 AGRUPAR POR DIA
  const dailyMap: Record<
    string,
    { completed: number; pending: number }
  > = {};

  Object.entries(calendarData).forEach(([date, tasks]) => {

    const [year, month] = date.split("-").map(Number);

    if (year === selectedYear && month === selectedMonth) {

      if (!dailyMap[date]) {
        dailyMap[date] = { completed: 0, pending: 0 };
      }

      tasks.forEach((task) => {
        if (task.completed) dailyMap[date].completed++;
        else dailyMap[date].pending++;
      });

    }

  });

  // 🔥 ORDENAR
  const sorted = Object.entries(dailyMap).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  // 🔥 ACUMULADO
  let accCompleted = 0;
  let accPending = 0;

  const data = sorted.map(([date, values]) => {

    accCompleted += values.completed;
    accPending += values.pending;

    return {
      day: date.split("-")[2],
      completed: accCompleted,
      pending: accPending,
    };

  });

  // 🔥 TAXA
  const total = accCompleted + accPending;
  const rate =
    total > 0 ? Math.round((accCompleted / total) * 100) : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg space-y-4">

      {/* FILTROS */}
      <div className="flex gap-2 justify-center">

        <select
          value={selectedMonth}
          onChange={(e) =>
            setSelectedMonth(Number(e.target.value))
          }
          className="text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-600 text-white"
        >
          {[
            "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
            "Jul", "Ago", "Set", "Out", "Nov", "Dez"
          ].map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) =>
            setSelectedYear(Number(e.target.value))
          }
          className="text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-600 text-white"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

      </div>

      {/* TÍTULO */}
      <h3 className="text-white font-semibold text-center">
        Evolução Mensal
      </h3>

      {/* TAXA */}
      <div className="text-center text-sm text-zinc-400">
        Taxa de conclusão:{" "}
        <span className="text-green-400 font-semibold">
          {rate}%
        </span>
      </div>

      {/* GRÁFICO */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>

            <defs>
              <linearGradient id="greenArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>

              <linearGradient id="redArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#333" />

            <XAxis dataKey="day" stroke="#aaa" />
            <YAxis stroke="#aaa" />

            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #333",
                borderRadius: "10px",
              }}
            />

            <Legend />

            <Area
              type="monotone"
              dataKey="completed"
              stroke="#22c55e"
              fill="url(#greenArea)"
              strokeWidth={3}
              name="Concluídas"
            />

            <Area
              type="monotone"
              dataKey="pending"
              stroke="#ef4444"
              fill="url(#redArea)"
              strokeWidth={3}
              name="Pendentes"
            />

          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}