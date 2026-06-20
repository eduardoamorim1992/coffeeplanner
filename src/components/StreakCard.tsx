import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Flame,
  Trophy,
  Medal,
  Star,
  Award,
  Crown,
  Zap,
  Lock,
} from "lucide-react";

interface Props {
  userId: string;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Conta dias produtivos consecutivos terminando em hoje (ou ontem, se hoje ainda vazio). */
function computeStreak(days: Set<string>): number {
  const cur = new Date();
  cur.setHours(12, 0, 0, 0);
  if (!days.has(iso(cur))) {
    cur.setDate(cur.getDate() - 1);
    if (!days.has(iso(cur))) return 0;
  }
  let s = 0;
  while (days.has(iso(cur))) {
    s++;
    cur.setDate(cur.getDate() - 1);
  }
  return s;
}

export function StreakCard({ userId }: Props) {
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("atividades")
        .select("data")
        .eq("user_id", userId)
        .eq("completed", true);
      if (!active) return;
      const rows = (data as { data: string }[]) || [];
      const days = new Set(rows.map((r) => r.data));
      setTotal(rows.length);
      setStreak(computeStreak(days));
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const achievements = [
    { id: "first", label: "Primeira tarefa concluída", icon: Star, ok: total >= 1 },
    { id: "ten", label: "10 tarefas concluídas", icon: Medal, ok: total >= 10 },
    { id: "fifty", label: "50 tarefas concluídas", icon: Award, ok: total >= 50 },
    { id: "hundred", label: "100 tarefas concluídas", icon: Trophy, ok: total >= 100 },
    { id: "s3", label: "3 dias seguidos", icon: Flame, ok: streak >= 3 },
    { id: "s7", label: "7 dias seguidos", icon: Zap, ok: streak >= 7 },
    { id: "s30", label: "30 dias seguidos", icon: Crown, ok: streak >= 30 },
  ];

  if (!loaded) return null;

  return (
    <div className="glass-card flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            streak > 0
              ? "bg-amber-500/15 text-amber-500"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Flame className="h-5 w-5" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-lg font-bold tabular-nums">{streak}</p>
          <p className="text-[11px] text-muted-foreground">
            dia{streak === 1 ? "" : "s"} seguido{streak === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="hidden h-8 w-px bg-border sm:block" />

      <div className="leading-tight">
        <p className="text-lg font-bold tabular-nums">{total}</p>
        <p className="text-[11px] text-muted-foreground">tarefas concluídas</p>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {achievements.map((a) => {
          const Icon = a.ok ? a.icon : Lock;
          return (
            <div
              key={a.id}
              title={a.ok ? a.label : `Bloqueado · ${a.label}`}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                a.ok
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/60 text-muted-foreground/50"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
          );
        })}
      </div>
    </div>
  );
}
