import { RankingBoard } from "@/components/RankingBoard";
import { AlertsPanel } from "@/components/AlertsPanel";
import AppSidebar from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
} from "lucide-react";

interface Task {
  completed: boolean;
  data: string;
  division_id: string;
}

export default function Dashboard() {
  const [globalCalendarData, setGlobalCalendarData] =
    useState<Record<string, Record<string, Task[]>>>({});

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from("atividades")
        .select("*");

      if (error) {
        console.error("Erro ao buscar dados:", error);
        return;
      }

      const globalData: Record<string, Record<string, Task[]>> = {};

      let total = 0;
      let completed = 0;
      let pending = 0;

      const daily: Record<string, { c: number; p: number }> = {};

      data.forEach((task: any) => {
        total++;

        const date = task.data;
        const divisionId = task.division_id || "sem-divisao";

        // Agrupar por divisão
        if (!globalData[divisionId]) {
          globalData[divisionId] = {};
        }

        // Agrupar por data
        if (!globalData[divisionId][date]) {
          globalData[divisionId][date] = [];
        }

        globalData[divisionId][date].push(task);

        // Gráfico
        if (!daily[date]) {
          daily[date] = { c: 0, p: 0 };
        }

        // ✅ CORREÇÃO AQUI
        if (task.completed) {
          completed++;
          daily[date].c++;
        } else {
          pending++;
          daily[date].p++;
        }
      });

      const sorted = Object.entries(daily)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-10);

      const chart = sorted.map(([date, val]) => ({
        day: date.slice(8),
        concluido: val.c,
        pendente: val.p,
      }));

      setChartData(chart);
      setStats({ total, completed, pending });
      setGlobalCalendarData(globalData);
    }

    loadData();
  }, []);

  const rate =
    stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader divisionName="Dashboard Executivo" />

        <main className="flex-1 overflow-y-auto p-8 space-y-10 bg-muted/30">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-6">

            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <h2 className="text-3xl font-bold">{stats.total}</h2>
              </div>
              <ListTodo />
            </div>

            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <h2 className="text-3xl font-bold text-green-500">
                  {stats.completed}
                </h2>
              </div>
              <CheckCircle2 className="text-green-500" />
            </div>

            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <h2 className="text-3xl font-bold text-red-500">
                  {stats.pending}
                </h2>
              </div>
              <Clock className="text-red-500" />
            </div>

            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Performance</p>
                <h2 className="text-3xl font-bold text-primary">
                  {rate}%
                </h2>
              </div>
              <TrendingUp />
            </div>

          </div>

          {/* GRÁFICO */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">
              Performance operacional (últimos dias)
            </h3>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                  <XAxis dataKey="day" />
                  <YAxis />

                  <Tooltip />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="concluido"
                    stroke="#22c55e"
                    strokeWidth={3}
                    name="Concluídas"
                  />

                  <Line
                    type="monotone"
                    dataKey="pendente"
                    stroke="#ef4444"
                    strokeWidth={3}
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

            <div className="grid grid-cols-2 gap-8">

              <div className="bg-card border border-border rounded-xl p-6">
                <RankingBoard globalCalendarData={globalCalendarData} />
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <AlertsPanel globalCalendarData={globalCalendarData} />
              </div>

            </div>
          </div>

        </main>
      </div>
    </div>
  );
}