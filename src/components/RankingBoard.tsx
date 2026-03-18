import { Trophy } from "lucide-react";

interface Props {
  globalCalendarData: Record<string, Record<string, any[]>>;
}

export function RankingBoard({ globalCalendarData }: Props) {

  const users: Record<
    string,
    { total: number; completed: number }
  > = {};

  // 🔥 percorre TODAS as divisões
  Object.values(globalCalendarData).forEach((division: any) => {

    Object.values(division).forEach((tasks: any) => {

      tasks.forEach((task: any) => {

        const user = task.userName || "Sem usuário";

        if (!users[user]) {
          users[user] = { total: 0, completed: 0 };
        }

        users[user].total++;

        if (task.completed) {
          users[user].completed++;
        }

      });

    });

  });

  // 🔥 monta ranking
  const ranking = Object.entries(users).map(([name, val]) => ({
    name,
    total: val.total,
    completed: val.completed,
    rate:
      val.total > 0
        ? Math.round((val.completed / val.total) * 100)
        : 0,
  }));

  // 🔥 ordena
  ranking.sort((a, b) => b.rate - a.rate);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg">

      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Trophy size={18} />
        Ranking de Performance (Usuários)
      </h3>

      <div className="space-y-3">

        {ranking.map((user, index) => {

          const medal =
            index === 0 ? "🥇" :
            index === 1 ? "🥈" :
            index === 2 ? "🥉" : `${index + 1}.`;

          return (
            <div
              key={user.name}
              className="flex justify-between items-center text-sm"
            >

              <span className="text-muted-foreground">
                {medal} {user.name}
              </span>

              <span
                className={`font-semibold ${
                  user.rate >= 70
                    ? "text-green-500"
                    : user.rate >= 40
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {user.rate}%
              </span>

            </div>
          );
        })}

      </div>

    </div>
  );
}