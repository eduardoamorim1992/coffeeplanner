import { useParams, Navigate } from "react-router-dom";
import { getDivision } from "@/data/mockData";
import { WeeklyView } from "@/components/WeeklyView";
import { MonthlyView } from "@/components/MonthlyView";
import { MonthlyChart } from "@/components/MonthlyChart";
import { MotivationalBar } from "@/components/MotivationalBar";
import { MarketTicker } from "@/components/MarketTicker";
import { AppHeader } from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWeekdayOccurrenceInMonth(date: Date) {
  const weekday = date.getDay();
  let occurrence = 0;

  for (let day = 1; day <= date.getDate(); day++) {
    const current = new Date(date.getFullYear(), date.getMonth(), day);
    if (current.getDay() === weekday) occurrence++;
  }

  return occurrence;
}

function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  occurrence: number
) {
  let count = 0;

  for (let day = 1; day <= 31; day++) {
    const current = new Date(year, month, day);

    if (current.getMonth() !== month) break;

    if (current.getDay() === weekday) {
      count++;
      if (count === occurrence) return current;
    }
  }

  return null;
}

export default function DivisionPage() {
  const { divisionId } = useParams<{ divisionId: string }>();
  const division = getDivision(divisionId || "central");

  if (!division) return <Navigate to="/central" replace />;

  const [calendarData, setCalendarData] = useState<Record<string, any[]>>({});
  const [viewMode, setViewMode] = useState<"week" | "month">("month");
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateLocal(new Date())
  );

  async function loadTasks() {
    if (!divisionId) return;

    const { data, error } = await supabase
      .from("atividades")
      .select("*")
      .eq("division_id", divisionId);

    if (error) {
      console.error(error);
      return;
    }

    const grouped: Record<string, any[]> = {};

    data?.forEach((task) => {
      const date = task.data;

      if (!grouped[date]) grouped[date] = [];

      grouped[date].push({
        id: task.id,
        title: task.titulo,
        time: task.hora,
        completed: task.completed,
        priority: task.prioridade,
      });
    });

    setCalendarData(grouped);
  }

  useEffect(() => {
    loadTasks();
  }, [divisionId]);

  async function replicateNextMonth() {
    if (!divisionId) return;

    const confirmAction = confirm(
      "Replicar todas as atividades deste mês para o próximo mês?"
    );

    if (!confirmAction) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startMonth = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-01`;

    const endMonth = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-31`;

    const { data } = await supabase
      .from("atividades")
      .select("*")
      .eq("division_id", divisionId)
      .gte("data", startMonth)
      .lte("data", endMonth);

    const inserts: any[] = [];

    data?.forEach((task) => {
      const originalDate = new Date(`${task.data}T00:00:00`);
      const weekday = originalDate.getDay();
      const occurrence = getWeekdayOccurrenceInMonth(originalDate);

      const nextMonth = originalDate.getMonth() + 1;
      const nextYear =
        nextMonth > 11
          ? originalDate.getFullYear() + 1
          : originalDate.getFullYear();

      const normalizedMonth = nextMonth > 11 ? 0 : nextMonth;

      const targetDate = getNthWeekdayOfMonth(
        nextYear,
        normalizedMonth,
        weekday,
        occurrence
      );

      if (!targetDate) return;

      inserts.push({
        division_id: divisionId,
        data: formatDateLocal(targetDate),
        hora: task.hora,
        titulo: task.titulo,
        prioridade: task.prioridade,
        completed: false,
      });
    });

    if (inserts.length === 0) return;

    await supabase.from("atividades").insert(inserts);

    alert("Replicado com sucesso!");
    loadTasks();
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader divisionName={division.name} />

        <main className="flex-1 p-4 md:p-6 space-y-4 w-full overflow-y-auto flex flex-col">
          <MarketTicker />
          <MotivationalBar />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2 bg-zinc-900/60 backdrop-blur-md border border-zinc-700 rounded-xl p-1 shadow-lg">
              <button
                onClick={() => setViewMode("month")}
                className={`px-4 py-1.5 rounded-lg text-sm transition ${
                  viewMode === "month"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                Mensal
              </button>

              <button
                onClick={() => setViewMode("week")}
                className={`px-4 py-1.5 rounded-lg text-sm transition ${
                  viewMode === "week"
                    ? "bg-red-500 text-white"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                Semana
              </button>

              <button
                onClick={replicateNextMonth}
                className="px-4 py-1.5 rounded-lg text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
              >
                Replicar próximo mês
              </button>
            </div>
          </div>

          {viewMode === "month" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
              
              {/* Calendário: 7 ou 8 colunas dependendo do tamanho da tela */}
              <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 w-full h-full flex flex-col min-h-0">
                <MonthlyView
                  calendarData={calendarData}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setViewMode("week");
                  }}
                />
              </div>

              {/* Gráfico: 5 ou 4 colunas preenchendo o restante e ficando mais próximo */}
              <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 w-full h-full flex flex-col min-h-0">
                <MonthlyChart calendarData={calendarData} />
              </div>

            </div>
          ) : (
            <div className="w-full overflow-x-auto flex-1 min-h-0">
              <div className="min-w-[1200px] h-full">
                <WeeklyView
                  calendarData={calendarData}
                  setCalendarData={setCalendarData}
                  selectedDate={selectedDate}
                  divisionId={divisionId}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}