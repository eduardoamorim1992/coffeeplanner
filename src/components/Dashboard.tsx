import { RankingBoard } from "@/components/RankingBoard";
import { AlertsPanel } from "@/components/AlertsPanel";
import AppSidebar from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { QuickInsightCapture } from "@/components/QuickInsightCapture";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchApprovedShareTargetIds } from "@/lib/activityShares";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

import {
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  Users,
} from "lucide-react";

const MANAGER_ROLES = [
  "diretor",
  "coordenador",
  "supervisor",
  "gerente",
] as const;

/** YYYY-MM-DD no fuso local */
function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Últimos `dayCount` dias corridos incluindo hoje */
function getPeriodBounds(dayCount: number): { start: string; end: string } {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (dayCount - 1));
  return { start: formatDateLocal(start), end: formatDateLocal(end) };
}

/** Lista cada dia entre start e end (inclusive), em ordem */
function enumerateDatesInclusive(startIso: string, endIso: string): string[] {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const out: string[] = [];
  const cur = new Date(sy, sm - 1, sd, 12, 0, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0, 0);
  while (cur <= end) {
    out.push(formatDateLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function Dashboard() {
  const [globalCalendarData, setGlobalCalendarData] =
    useState<Record<string, Record<string, any[]>>>({});

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [range, setRange] = useState<"7" | "30" | "365">("7");
  const [loading, setLoading] = useState(true);
  const [scopeTitle, setScopeTitle] = useState("");
  const [scopeDetail, setScopeDetail] = useState("");
  const [teamSize, setTeamSize] = useState<number | null>(null);
  const [periodHint, setPeriodHint] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const dayCount = range === "7" ? 7 : range === "30" ? 30 : 365;
      const { start: rangeStart, end: rangeEnd } = getPeriodBounds(dayCount);
      setPeriodHint(`${formatDateBR(rangeStart)} – ${formatDateBR(rangeEnd)}`);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setLoading(false);
        return;
      }

      const { data: meData, error: meError } = await supabase
        .from("users")
        .select("id, nome, role")
        .eq("email", user.email)
        .single();

      if (meError || !meData) {
        console.error("Usuário não encontrado na tabela users:", meError);
        setLoading(false);
        return;
      }

      const role = String(meData.role || "").toLowerCase().trim();

      let allowedUserIds: string[] | null = null;

      if (role === "admin") {
        allowedUserIds = null;
        setScopeTitle("Visão executiva");
        setScopeDetail("Dados de toda a organização.");
        setTeamSize(null);
      } else if (MANAGER_ROLES.includes(role as (typeof MANAGER_ROLES)[number])) {
        const { data: relations } = await supabase
          .from("user_managers")
          .select("user_id")
          .eq("manager_id", meData.id);

        const subordinates = relations?.map((r) => r.user_id) || [];
        allowedUserIds = [meData.id, ...subordinates];
        setScopeTitle("Dashboard da sua equipe");
        setScopeDetail(
          subordinates.length === 0
            ? `Olá, ${meData.nome}. Ainda não há colaboradores vinculados a você como gestor — exibindo apenas suas atividades. Peça ao admin para associar sua equipe em "Gerenciar Usuários".`
            : `Olá, ${meData.nome}. Indicadores de você e da sua equipe (${subordinates.length} colaborador${subordinates.length === 1 ? "" : "es"}).`
        );
      } else {
        allowedUserIds = [meData.id];
        setScopeTitle("Seu desempenho");
        setScopeDetail(`Dados apenas das suas atividades, ${meData.nome}.`);
      }

      if (allowedUserIds !== null) {
        const sharedIds = await fetchApprovedShareTargetIds(meData.id);
        allowedUserIds = [...new Set([...allowedUserIds, ...sharedIds])];
        if (sharedIds.length > 0) {
          setScopeDetail((prev) =>
            prev.includes("compartilh")
              ? prev
              : `${prev} Inclui atividades de colaboradores que autorizaram você a visualizar.`
          );
        }
        setTeamSize(allowedUserIds.length);
      }

      let query = supabase
        .from("atividades")
        .select("*")
        .gte("data", rangeStart)
        .lte("data", rangeEnd);

      if (allowedUserIds !== null) {
        query = query.in("user_id", allowedUserIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar dados:", error);
        setLoading(false);
        return;
      }

      const rows = (data || []).filter(
        (t: any) =>
          t.data &&
          typeof t.data === "string" &&
          t.data >= rangeStart &&
          t.data <= rangeEnd
      );

      const userIds = [
        ...new Set(rows.map((t: any) => t.user_id).filter(Boolean)),
      ] as string[];

      let idToName: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: usersRows } = await supabase
          .from("users")
          .select("id, nome")
          .in("id", userIds);

        idToName = Object.fromEntries(
          (usersRows || []).map((u: any) => [u.id, u.nome])
        );
      }

      const globalData: Record<string, Record<string, any[]>> = {};

      let total = 0;
      let completed = 0;
      let pending = 0;

      const daily: Record<string, { c: number; p: number }> = {};

      rows.forEach((task: any) => {
        total++;

        const date = task.data;
        const divisionId = task.division_id || "equipe";

        const userName =
          idToName[task.user_id] ||
          (task.user_id ? `Usuário…${String(task.user_id).slice(0, 8)}` : "Sem usuário");

        const enriched = { ...task, userName };

        if (!globalData[divisionId]) {
          globalData[divisionId] = {};
        }

        if (!globalData[divisionId][date]) {
          globalData[divisionId][date] = [];
        }

        globalData[divisionId][date].push(enriched);

        if (!daily[date]) {
          daily[date] = { c: 0, p: 0 };
        }

        if (task.completed) {
          completed++;
          daily[date].c++;
        } else {
          pending++;
          daily[date].p++;
        }
      });

      const dateSeries = enumerateDatesInclusive(rangeStart, rangeEnd);

      const chart = dateSeries.map((date) => {
        const val = daily[date] || { c: 0, p: 0 };
        const [, m, d] = date.split("-");
        return {
          date,
          day: `${d}/${m}`,
          concluido: val.c,
          pendente: val.p,
        };
      });

      setChartData(chart);
      setStats({ total, completed, pending });
      setGlobalCalendarData(globalData);
      setLoading(false);
    }

    loadData();
  }, [range]);

  const rate =
    stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

  const rateColorClass = rate >= 90 ? "text-green-500" : "text-red-500";

  const chartTickInterval =
    range === "7" ? 0 : range === "30" ? 4 : 29;

  return (
    <div className="flex h-[100dvh] min-h-0 bg-background overflow-hidden">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <AppHeader divisionName="Dashboard Executivo" />

        <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-6 md:p-8 space-y-6 md:space-y-10 bg-muted/30">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Carregando indicadores…
            </div>
          ) : (
            <>
          {/* Faixa de contexto (admin vs equipe) */}
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                {teamSize != null && teamSize > 1 ? (
                  <Users className="h-5 w-5 text-primary shrink-0" />
                ) : null}
                {scopeTitle}
              </h2>
              <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
                {scopeDetail}
              </p>
            </div>
            {teamSize != null && teamSize > 1 ? (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 shrink-0">
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {teamSize}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  pessoas no<br className="hidden sm:block" /> escopo
                </span>
              </div>
            ) : null}
          </div>

          {/* KPIs — sempre no mesmo período do gráfico */}
          <p className="text-xs text-muted-foreground -mt-2">
            Indicadores no período: <span className="font-medium text-foreground">{periodHint}</span>
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">

            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                <h2 className="text-2xl sm:text-3xl font-bold tabular-nums">{stats.total}</h2>
              </div>
              <ListTodo className="shrink-0 opacity-80" />
            </div>

            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Concluídas</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-green-500 tabular-nums">
                  {stats.completed}
                </h2>
              </div>
              <CheckCircle2 className="text-green-500 shrink-0" />
            </div>

            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Pendentes</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-red-500 tabular-nums">
                  {stats.pending}
                </h2>
              </div>
              <Clock className="text-red-500 shrink-0" />
            </div>

            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 flex items-center justify-between gap-2 col-span-2 lg:col-span-1">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Performance</p>
                <h2 className={`text-2xl sm:text-3xl font-bold tabular-nums ${rateColorClass}`}>
                  {rate}%
                </h2>
              </div>
              <TrendingUp className={`shrink-0 ${rateColorClass}`} />
            </div>

          </div>

          {/* GRÁFICO */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h3 className="text-base sm:text-lg font-semibold">
                Performance operacional
              </h3>

              {/* FILTRO */}
              <div className="flex flex-wrap gap-2">
                {(["7", "30", "365"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      range === r
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {r === "7" && "7 dias"}
                    {r === "30" && "30 dias"}
                    {r === "365" && "1 ano"}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground -mt-1 mb-1">
              Eixo X: cada ponto é um dia do calendário; dias sem tarefas aparecem como 0.
            </p>

            <div className="h-56 sm:h-64 md:h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -8, bottom: range === "365" ? 8 : 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    interval={chartTickInterval}
                    angle={range === "365" ? -35 : 0}
                    textAnchor={range === "365" ? "end" : "middle"}
                    height={range === "365" ? 48 : 28}
                  />
                  <YAxis width={36} tick={{ fontSize: 11 }} allowDecimals={false} />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as {
                        date?: string;
                        concluido: number;
                        pendente: number;
                      };
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
                          <p className="font-medium text-foreground mb-1.5">
                            {row.date ? formatDateBR(row.date) : "—"}
                          </p>
                          <p className="text-green-600 dark:text-green-400">
                            Concluídas: {row.concluido}
                          </p>
                          <p className="text-red-600 dark:text-red-400">
                            Pendentes: {row.pendente}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="concluido"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Concluídas"
                  />

                  <Line
                    type="monotone"
                    dataKey="pendente"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Pendentes"
                  />

                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* ANÁLISE */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Análise operacional
            </h3>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
              <div className="min-w-0">
                <RankingBoard globalCalendarData={globalCalendarData} />
              </div>

              <div className="min-w-0">
                <AlertsPanel globalCalendarData={globalCalendarData} />
              </div>
            </div>
          </div>
            </>
          )}

        </main>
      </div>

      <QuickInsightCapture contextLabel="Dashboard executivo" />
    </div>
  );
}