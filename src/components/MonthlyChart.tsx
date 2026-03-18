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

  const sorted = Object.entries(dailyMap).sort(([a], [b]) =>
    a.localeCompare(b)
  );

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

  const total = accCompleted + accPending;
  const rate =
    total > 0 ? Math.round((accCompleted / total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-4 transition">

      {/* FILTROS */}
      <div className="flex gap-2 justify-center">

        <select
          value={selectedMonth}
          onChange={(e) =>
            setSelectedMonth(Number(e.target.value))
          }
          className="text-xs px-2 py-1 rounded bg-muted border border-border text-foreground"
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
          className="text-xs px-2 py-1 rounded bg-muted border border-border text-foreground"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

      </div>

      {/* TÍTULO */}
      <h3 className="text-foreground font-semibold text-center">
        Evolução Mensal
      </h3>

      {/* TAXA */}
      <div className="text-center text-sm text-muted-foreground">
        Taxa de conclusão:{" "}
        <span className="text-green-500 font-semibold">
          {rate}%
        </span>
      </div>

      {/* GRÁFICO */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>

            <defs>
              <linearGradient id="greenArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>

              <linearGradient id="redArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />

            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "10px",
                color: "white"
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