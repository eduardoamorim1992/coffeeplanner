import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface Task {
  completed: boolean;
}

interface DashboardChartProps {
  calendarData: Record<string, Task[]>;
}

export function DashboardChart({ calendarData }: DashboardChartProps) {
  const now = new Date();
  const monthLabels = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const { dailySeries, monthlySeries, totals } = useMemo(() => {
    const dailyMap: Record<string, { completed: number; pending: number }> = {};

    Object.entries(calendarData).forEach(([date, tasks]) => {
      const [year, month] = date.split("-").map(Number);
      const isSelectedPeriod = year === selectedYear && month === selectedMonth;

      tasks.forEach((task) => {
        if (isSelectedPeriod) {
          if (!dailyMap[date]) {
            dailyMap[date] = { completed: 0, pending: 0 };
          }
        }

        if (task.completed) {
          if (isSelectedPeriod) {
            dailyMap[date].completed += 1;
          }
        } else {
          if (isSelectedPeriod) {
            dailyMap[date].pending += 1;
          }
        }
      });
    });

    const sortedDaily = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        day: date.slice(8),
        completed: values.completed,
        pending: values.pending,
      }));

    const completedTotal = sortedDaily.reduce((acc, i) => acc + i.completed, 0);
    const pendingTotal = sortedDaily.reduce((acc, i) => acc + i.pending, 0);
    const total = completedTotal + pendingTotal;
    const selectedPeriodLabel = `${monthLabels[selectedMonth - 1]}/${selectedYear}`;
    const filteredMonthly = [
      {
        month: selectedPeriodLabel,
        completed: completedTotal,
        pending: pendingTotal,
      },
    ];

    return {
      dailySeries: sortedDaily,
      monthlySeries: filteredMonthly,
      totals: {
        total,
        completed: completedTotal,
        pending: pendingTotal,
        rate: total > 0 ? Math.round((completedTotal / total) * 100) : 0,
      },
    };
  }, [calendarData, selectedMonth, selectedYear]);

  const years = useMemo(() => {
    const yearSet = new Set<number>();

    Object.keys(calendarData).forEach((date) => {
      const [year] = date.split("-").map(Number);
      if (!Number.isNaN(year)) yearSet.add(year);
    });

    if (yearSet.size === 0) {
      yearSet.add(now.getFullYear());
    }

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [calendarData, now]);

  const selectedPeriodLabel = `${monthLabels[selectedMonth - 1]}/${selectedYear}`;

  const chartTick = { fontSize: 11 };

  return (
    <div className="space-y-3 sm:space-y-4 transition-all duration-300">
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="text-sm min-h-[44px] flex-1 sm:flex-none px-3 py-2 rounded-xl bg-muted border border-border text-foreground"
        >
          {monthLabels.map((month, i) => (
            <option key={month} value={i + 1}>
              {month}
            </option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="text-sm min-h-[44px] flex-1 sm:flex-none px-3 py-2 rounded-xl bg-muted border border-border text-foreground"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground leading-tight">Total ({selectedMonth}/{selectedYear})</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{totals.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Concluídas</p>
          <p className="text-xl sm:text-2xl font-bold text-green-500 tabular-nums">{totals.completed}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Pendentes</p>
          <p className="text-xl sm:text-2xl font-bold text-red-500 tabular-nums">{totals.pending}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Taxa</p>
          <p className={`text-xl sm:text-2xl font-bold tabular-nums ${totals.rate >= 90 ? "text-green-500" : "text-red-500"}`}>
            {totals.rate}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 leading-snug">
            Atividades por dia — {selectedPeriodLabel}
          </h3>
          <div className="h-56 sm:h-64 md:h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={chartTick} interval="preserveStartEnd" />
                <YAxis width={28} tick={chartTick} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area type="monotone" dataKey="completed" stroke="#22c55e" fill="#22c55e33" name="Concluídas" />
                <Area type="monotone" dataKey="pending" stroke="#ef4444" fill="#ef444433" name="Pendentes" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 leading-snug">
            Atividades por mês — {selectedPeriodLabel}
          </h3>
          <div className="h-56 sm:h-64 md:h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={chartTick} />
                <YAxis width={28} tick={chartTick} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="completed" fill="#22c55e" name="Concluídas" />
                <Bar dataKey="pending" fill="#ef4444" name="Pendentes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
