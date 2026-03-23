import { Trophy } from "lucide-react";

interface Props {
  globalCalendarData: Record<string, Record<string, any[]>>;
}

export function RankingBoard({ globalCalendarData }: Props) {

  const users: Record<
    string,
    { total: number; completed: number; displayName: string }
  > = {};

  // Agrupa por user_id (evita fundir homônimos) e exibe nome amigável
  Object.values(globalCalendarData).forEach((division: any) => {

    Object.values(division).forEach((tasks: any) => {

      tasks.forEach((task: any) => {

        const uid = task.user_id ? String(task.user_id) : "sem-id";
        const displayName = task.userName || "Sem usuário";

        if (!users[uid]) {
          users[uid] = { total: 0, completed: 0, displayName };
        }

        users[uid].total++;

        if (task.completed) {
          users[uid].completed++;
        }

      });

    });

  });

  const ranking = Object.entries(users).map(([uid, val]) => ({
    id: uid,
    name: val.displayName,
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
              key={user.id}
              className="flex justify-between items-center gap-2 text-sm"
            >

              <span className="text-muted-foreground truncate min-w-0">
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