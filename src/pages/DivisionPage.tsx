import { useParams } from "react-router-dom";
import { WeeklyView } from "@/components/WeeklyView";
import { MonthlyView } from "@/components/MonthlyView";
import { MonthlyChart } from "@/components/MonthlyChart";
import { MotivationalBar } from "@/components/MotivationalBar";
import { MarketTicker } from "@/components/MarketTicker";
import { AppHeader } from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

// 🔥 FORMATAR DATA
function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// 🔥 PARSE DATA
function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// 🔥 OCORRÊNCIA DO DIA
function getWeekdayOccurrence(date: Date) {
  const weekday = date.getDay();
  let count = 0;

  for (let d = 1; d <= date.getDate(); d++) {
    const current = new Date(date.getFullYear(), date.getMonth(), d);
    if (current.getDay() === weekday) count++;
  }

  return count;
}

// 🔥 MESMA OCORRÊNCIA NO PRÓXIMO MÊS
function getNthWeekday(
  year: number,
  month: number,
  weekday: number,
  occurrence: number
) {
  let count = 0;

  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;

    if (date.getDay() === weekday) {
      count++;
      if (count === occurrence) return date;
    }
  }

  return null;
}

// 🔥 USUÁRIO LOGADO
async function getLoggedUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("email", user.email)
    .single();

  return data;
}

export default function DivisionPage() {
  const { userId } = useParams();

  const [calendarData, setCalendarData] = useState<Record<string, any[]>>({});
  const [viewMode, setViewMode] = useState<"week" | "month">("month");
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateLocal(new Date())
  );
  const [userName, setUserName] = useState("");
  const [loadingReplicate, setLoadingReplicate] = useState(false);

  // 🔥 FUNÇÃO CORRIGIDA DE VER PERMISSÕES
  async function loadTasks() {
    const me = await getLoggedUser();
    if (!me) return;

    const role = String(me.role || "").toLowerCase().trim();

    let userIds: string[] = [];

    // 🔥 ADMIN → vê tudo
    if (role === "admin") {
      const { data } = await supabase.from("users").select("id");
      userIds = data?.map((u) => u.id) || [];
    }

    // 🔥 GESTORES → só subordinados
    else if (
      role === "coordenador" ||
      role === "supervisor" ||
      role === "gerente"
    ) {
      const { data } = await supabase
        .from("user_managers")
        .select("user_id")
        .eq("manager_id", me.id);

      userIds = [me.id, ...(data?.map((d) => d.user_id) || [])];
    }

    // 🔥 USUÁRIO NORMAL
    else {
      userIds = [me.id];
    }

    // 🔥 SE CLICAR EM UM USUÁRIO
    if (userId) {
      userIds = [userId];

      const { data: userData } = await supabase
        .from("users")
        .select("nome")
        .eq("id", userId)
        .single();

      setUserName(userData?.nome || "");
    } else {
      setUserName(me.nome);
    }

    // 🔥 BUSCAR ATIVIDADES
    const { data: tasks } = await supabase
      .from("atividades")
      .select("*")
      .in("user_id", userIds);

    const grouped: Record<string, any[]> = {};

    tasks?.forEach((task) => {
      if (!grouped[task.data]) grouped[task.data] = [];

      grouped[task.data].push({
        id: task.id,
        title: task.titulo,
        time: task.hora ? task.hora.slice(0, 5) : null,
        completed: task.completed,
        priority: task.prioridade,
      });
    });

    setCalendarData(grouped);
  }

  useEffect(() => {
    loadTasks();
  }, [userId]);

  // 🔥 REPLICAR MÊS (mantido)
  async function replicateMonth() {
    const confirm = window.confirm(
      "Deseja copiar todas as atividades para o próximo mês?"
    );
    if (!confirm) return;

    setLoadingReplicate(true);

    const me = await getLoggedUser();
    if (!me) return;

    const { data: tasks } = await supabase
      .from("atividades")
      .select("*")
      .eq("user_id", me.id);

    if (!tasks) return;

    const inserts: any[] = [];

    for (const task of tasks) {
      const original = parseLocalDate(task.data);

      const weekday = original.getDay();
      const occurrence = getWeekdayOccurrence(original);

      const nextMonth = original.getMonth() + 1;
      const nextYear =
        nextMonth > 11
          ? original.getFullYear() + 1
          : original.getFullYear();

      const normalizedMonth = nextMonth > 11 ? 0 : nextMonth;

      const target = getNthWeekday(
        nextYear,
        normalizedMonth,
        weekday,
        occurrence
      );

      if (!target) continue;

      inserts.push({
        user_id: me.id,
        data: formatDateLocal(target),
        hora: task.hora,
        titulo: task.titulo,
        prioridade: task.prioridade,
        completed: false,
      });
    }

    await supabase.from("atividades").insert(inserts);

    setLoadingReplicate(false);
    loadTasks();
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader divisionName={userName} />

        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          <MarketTicker />
          <MotivationalBar />

          <div className="flex items-center justify-between">
            <div className="flex bg-muted/30 border rounded-lg p-1">
              <button
                onClick={() => setViewMode("month")}
                className={`px-4 py-1.5 rounded ${
                  viewMode === "month"
                    ? "bg-white text-black"
                    : ""
                }`}
              >
                📅 Mensal
              </button>

              <button
                onClick={() => setViewMode("week")}
                className={`px-4 py-1.5 rounded ${
                  viewMode === "week"
                    ? "bg-white text-black"
                    : ""
                }`}
              >
                📆 Semana
              </button>
            </div>

            <button
              onClick={replicateMonth}
              className="bg-blue-600 px-4 py-1.5 rounded"
            >
              🔁 Replicar mês
            </button>
          </div>

          {viewMode === "month" ? (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8">
                <MonthlyView
                  calendarData={calendarData}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setViewMode("week");
                  }}
                />
              </div>

              <div className="col-span-4">
                <MonthlyChart calendarData={calendarData} />
              </div>
            </div>
          ) : (
            <WeeklyView
              calendarData={calendarData}
              setCalendarData={setCalendarData}
              selectedDate={selectedDate}
            />
          )}
        </main>
      </div>
    </div>
  );
}