import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface Task {
  completed: boolean;
}

interface Props {
  calendarData: Record<string, Task[]>;
}

export function MonthlyChart({ calendarData }: Props) {
  const monthlyMap: Record<
    string,
    { completed: number; pending: number }
  > = {};

  Object.entries(calendarData).forEach(([date, tasks]) => {
    const monthKey = date.slice(0, 7);

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { completed: 0, pending: 0 };
    }

    tasks.forEach((task) => {
      if (task.completed) {
        monthlyMap[monthKey].completed += 1;
      } else {
        monthlyMap[monthKey].pending += 1;
      }
    });
  });

  const data = Object.entries(monthlyMap).map(
    ([month, values]) => {
      const total =
        values.completed + values.pending;

      const rate =
        total > 0
          ? Math.round((values.completed / total) * 100)
          : 0;

      return {
        month,
        completed: values.completed,
        pending: values.pending,
        rate,
      };
    }
  );

  const currentMonth = data[data.length - 1];
  const previousMonth = data[data.length - 2];

  const variation =
    previousMonth && currentMonth
      ? currentMonth.completed -
        previousMonth.completed
      : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg space-y-4">
      <h3 className="text-white font-semibold text-center">
        Performance Mensal
      </h3>

      {currentMonth && (
        <div className="text-center text-sm text-zinc-400">
          Taxa de conclusão:{" "}
          <span className="text-green-400 font-semibold">
            {currentMonth.rate}%
          </span>
        </div>
      )}

      {variation !== 0 && (
        <div className="text-center text-xs">
          {variation > 0 ? (
            <span className="text-green-400">
              ▲ {variation} tarefas a mais que mês anterior
            </span>
          ) : (
            <span className="text-red-400">
              ▼ {Math.abs(variation)} tarefas a menos que mês anterior
            </span>
          )}
        </div>
      )}

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="completed"
              fill="#22c55e"
              radius={[6, 6, 0, 0]}
              name="Concluídas"
            />
            <Bar
              dataKey="pending"
              fill="#ef4444"
              radius={[6, 6, 0, 0]}
              name="Pendentes"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}