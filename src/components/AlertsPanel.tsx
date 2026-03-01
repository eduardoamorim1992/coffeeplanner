interface Props {
  globalCalendarData: Record<string, Record<string, any[]>>;
}

export function AlertsPanel({ globalCalendarData }: Props) {
  const alerts: string[] = [];

  Object.entries(globalCalendarData).forEach(
    ([divisionId, calendar]) => {
      Object.entries(calendar).forEach(
        ([date, tasks]) => {
          tasks.forEach((task: any) => {
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

  return (
    <div className="bg-zinc-900 border border-red-500 rounded-xl p-6 shadow-lg">
      <h3 className="text-red-400 font-semibold mb-4">
        🚨 Alertas Inteligentes
      </h3>

      {alerts.length === 0 ? (
        <p className="text-green-400 text-sm">
          Nenhum alerta no momento.
        </p>
      ) : (
        <div className="space-y-2 text-sm text-zinc-300">
          {alerts.slice(0, 5).map((alert, i) => (
            <div key={i}>• {alert}</div>
          ))}
        </div>
      )}
    </div>
  );
}