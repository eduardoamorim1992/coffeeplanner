import { divisions } from "@/data/mockData";

interface Props {
  globalCalendarData: Record<string, Record<string, any[]>>;
}

export function RankingBoard({ globalCalendarData }: Props) {
  const ranking = divisions.map((division) => {
    const divisionData =
      globalCalendarData[division.id] || {};

    let completed = 0;
    let total = 0;

    Object.values(divisionData).forEach((tasks) => {
      tasks.forEach((task: any) => {
        total += 1;
        if (task.completed) completed += 1;
      });
    });

    const rate =
      total > 0
        ? Math.round((completed / total) * 100)
        : 0;

    return {
      name: division.name,
      completed,
      total,
      rate,
    };
  });

  ranking.sort((a, b) => b.rate - a.rate);

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg">
      <h3 className="text-white font-semibold mb-4">
        🏆 Ranking de Performance
      </h3>

      <div className="space-y-3">
        {ranking.map((division, index) => (
          <div
            key={division.name}
            className="flex justify-between items-center text-sm"
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
  );
}