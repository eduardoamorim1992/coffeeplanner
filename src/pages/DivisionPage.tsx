import { useParams } from "react-router-dom";
import { MotivationalBar } from "@/components/MotivationalBar";
import { MarketTicker } from "@/components/MarketTicker";
import { AppHeader } from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import { CalendarView } from "@/components/CalendarView";
import { DashboardChart } from "@/components/DashboardChart";
import { OKRPanel } from "@/components/OKRPanel";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";

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
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateLocal(new Date())
  );
  const [view, setView] = useState<"calendar" | "chart" | "okr">("calendar");
  const [userName, setUserName] = useState("");
  const [loadingReplicate, setLoadingReplicate] = useState(false);
  const [me, setMe] = useState<any>(null);
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  // 🔥 CARREGAR ATIVIDADES COM PERMISSÃO
  async function loadTasks() {
    const meData = await getLoggedUser();
    if (!meData) return;

    setMe(meData);

    const role = String(meData.role || "").toLowerCase().trim();

    let allowedUserIds: string[] = [];

    // 🔥 ADMIN
    if (role === "admin") {
      const { data } = await supabase.from("users").select("id");
      allowedUserIds = data?.map((u) => u.id) || [];
    }

    // 🔥 GESTOR
    else if (
      role === "coordenador" ||
      role === "supervisor" ||
      role === "gerente"
    ) {
      const { data } = await supabase
        .from("user_managers")
        .select("user_id")
        .eq("manager_id", meData.id);

      allowedUserIds = [meData.id, ...(data?.map((d) => d.user_id) || [])];
    }

    // 🔥 NORMAL
    else {
      allowedUserIds = [meData.id];
    }

    let finalUserIds = allowedUserIds;

    if (userId && allowedUserIds.includes(userId)) {
      finalUserIds = [userId];

      const { data: userData } = await supabase
        .from("users")
        .select("nome")
        .eq("id", userId)
        .single();

      setUserName(userData?.nome || "");
    } else {
      setUserName(meData.nome);
    }

    const { data: tasks } = await supabase
      .from("atividades")
      .select("*")
      .in("user_id", finalUserIds);

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

  useEffect(() => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkUpcomingTasks = () => {
      const now = new Date();
      const today = formatDateLocal(now);
      const tasksToday = calendarData[today] || [];

      tasksToday.forEach((task) => {
        if (!task?.id || !task?.time || task.completed) return;

        const [h, m] = String(task.time).split(":").map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return;

        const scheduledAt = new Date(now);
        scheduledAt.setHours(h, m, 0, 0);

        const diffMs = scheduledAt.getTime() - now.getTime();
        const taskKey = `${today}-${task.id}-${task.time}`;

        // Notifica apenas no intervalo de 10 minutos antes da atividade.
        if (diffMs > 0 && diffMs <= 10 * 60 * 1000 && !notifiedTasksRef.current.has(taskKey)) {
          notifiedTasksRef.current.add(taskKey);

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Atividade agendada", {
              body: `${task.title} as ${task.time}`,
            });
          }
        }
      });
    };

    checkUpcomingTasks();
    const interval = setInterval(checkUpcomingTasks, 60 * 1000);

    return () => clearInterval(interval);
  }, [calendarData]);

  // 🔥 REPLICAR (SOMENTE DO USUÁRIO LOGADO)
  async function replicateMonth() {
    const confirm = window.confirm(
      "Deseja replicar suas atividades para todos os mesmos dias da semana no mês atual?"
    );
    if (!confirm) return;

    setLoadingReplicate(true);

    if (!me) {
      setLoadingReplicate(false);
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const rangeStart = formatDateLocal(new Date(year, month, 1));
    const rangeEnd = formatDateLocal(new Date(year, month, lastDay));

    // Busca apenas o que está no mês atual para evitar inserir em meses diferentes.
    const { data: sourceTasks, error: sourceError } = await supabase
      .from("atividades")
      .select("*")
      .eq("user_id", me.id)
      .gte("data", rangeStart)
      .lte("data", rangeEnd);

    if (sourceError) {
      console.error("Erro ao buscar atividades para replicar:", sourceError);
      setLoadingReplicate(false);
      return;
    }

    const { data: existingTasks, error: existingError } = await supabase
      .from("atividades")
      .select("data, hora, titulo")
      .eq("user_id", me.id)
      .gte("data", rangeStart)
      .lte("data", rangeEnd);

    if (existingError) {
      console.error("Erro ao buscar atividades existentes:", existingError);
      setLoadingReplicate(false);
      return;
    }

    const keyOf = (dataIso: string, hora: any, titulo: any) =>
      `${dataIso}|${hora ?? ""}|${titulo ?? ""}`;

    // Evita duplicar no dia original e também em datas já existentes.
    const existingKeys = new Set(
      (existingTasks || []).map((t: any) =>
        keyOf(t.data, t.hora, t.titulo)
      )
    );

    const inserts: any[] = [];
    const insertedKeys = new Set<string>();

    for (const task of sourceTasks || []) {
      const original = parseLocalDate(task.data);
      const weekday = original.getDay();

      for (let d = 1; d <= lastDay; d++) {
        const date = new Date(year, month, d);
        if (date.getDay() !== weekday) continue;

        const targetIso = formatDateLocal(date);
        const k = keyOf(targetIso, task.hora, task.titulo);

        if (existingKeys.has(k) || insertedKeys.has(k)) continue;

        inserts.push({
          user_id: me.id,
          data: targetIso,
          hora: task.hora,
          titulo: task.titulo,
          prioridade: task.prioridade,
          completed: false,
        });

        insertedKeys.add(k);
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from("atividades")
        .insert(inserts);

      if (insertError) {
        console.error("Erro ao inserir atividades replicadas:", insertError);
      }
    }

    setLoadingReplicate(false);
    loadTasks();
  }

  const tabActive = (active: boolean) =>
    active
      ? "bg-gradient-to-r from-primary to-red-500 text-white border-red-400/80 shadow-[0_10px_30px_-14px_rgba(239,68,68,0.75)] ring-1 ring-red-300/30"
      : "bg-zinc-900/70 backdrop-blur-sm border-zinc-700/80 text-zinc-200 hover:bg-zinc-800/80 hover:border-zinc-500/80";

  const tabDesktop = (active: boolean) =>
    `px-5 py-2.5 rounded-2xl border text-sm font-semibold tracking-[0.01em] transition-all duration-200 active:scale-[0.98] ${tabActive(active)}`;

  const tabMobile = (active: boolean) =>
    `flex-1 min-h-[52px] rounded-2xl border text-sm font-semibold tracking-[0.01em] transition-all duration-200 active:scale-[0.98] ${tabActive(active)}`;

  return (
    <div className="flex h-[100dvh] min-h-0 bg-background overflow-hidden">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <AppHeader divisionName={userName} />

        <main className="flex-1 min-h-0 p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 overflow-y-auto overscroll-y-contain pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
          <MarketTicker />
          <MotivationalBar />

          {/* Abas no desktop / tablet */}
          <div className="hidden md:flex flex-wrap gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-2 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={tabDesktop(view === "calendar")}
            >
              📅 Calendário
            </button>
            <button
              type="button"
              onClick={() => setView("chart")}
              className={tabDesktop(view === "chart")}
            >
              📊 Ver Gráfico
            </button>
            <button
              type="button"
              onClick={() => setView("okr")}
              className={tabDesktop(view === "okr")}
            >
              🎯 OKR
            </button>
          </div>

          <section className="w-full transition-opacity duration-200">
            {view === "calendar" && (
              <CalendarView
                calendarData={calendarData}
                setCalendarData={setCalendarData}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                loadingReplicate={loadingReplicate}
                onReplicateMonth={replicateMonth}
                canReplicate={!userId || userId === me?.id}
              />
            )}

            {view === "chart" && (
              <DashboardChart calendarData={calendarData} />
            )}

            {view === "okr" && <OKRPanel />}
          </section>
        </main>

        {/* Barra inferior — mobile (estilo app nativo) */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 pb-safe pt-2 px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
          aria-label="Navegação principal"
        >
          <div className="flex gap-1.5 max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`${tabMobile(view === "calendar")} flex flex-col gap-0.5 py-2`}
            >
              <span className="text-lg leading-none">📅</span>
              <span className="text-[11px] font-semibold leading-tight">Calendário</span>
            </button>
            <button
              type="button"
              onClick={() => setView("chart")}
              className={`${tabMobile(view === "chart")} flex flex-col gap-0.5 py-2`}
            >
              <span className="text-lg leading-none">📊</span>
              <span className="text-[11px] font-semibold leading-tight">Gráfico</span>
            </button>
            <button
              type="button"
              onClick={() => setView("okr")}
              className={`${tabMobile(view === "okr")} flex flex-col gap-0.5 py-2`}
            >
              <span className="text-lg leading-none">🎯</span>
              <span className="text-[11px] font-semibold leading-tight">OKR</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}