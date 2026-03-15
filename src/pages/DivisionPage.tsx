import { useParams, Navigate } from "react-router-dom";
import { getDivision } from "@/data/mockData";
import { WeeklyView } from "@/components/WeeklyView";
import { MonthlyView } from "@/components/MonthlyView";
import { MonthlyChart } from "@/components/MonthlyChart";
import { MotivationalBar } from "@/components/MotivationalBar";
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
    if (current.getDay() === weekday) {
      occurrence++;
    }
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

      if (count === occurrence) {
        return current;
      }
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
      "Replicar todas as atividades deste mês para o próximo mês respeitando o dia da semana?"
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

    const { data, error } = await supabase
      .from("atividades")
      .select("*")
      .eq("division_id", divisionId)
      .gte("data", startMonth)
      .lte("data", endMonth);

    if (error) {
      console.error(error);
      alert("Erro ao buscar atividades do mês.");
      return;
    }

    if (!data || data.length === 0) {
      alert("Não há atividades neste mês para replicar.");
      return;
    }

    const inserts: any[] = [];

    for (const task of data) {
      const originalDate = new Date(`${task.data}T00:00:00`);
      const weekday = originalDate.getDay();
      const occurrence = getWeekdayOccurrenceInMonth(originalDate);

      const nextMonth = originalDate.getMonth() + 1;
      const nextYear =
        nextMonth > 11 ? originalDate.getFullYear() + 1 : originalDate.getFullYear();
      const normalizedNextMonth = nextMonth > 11 ? 0 : nextMonth;

      const targetDate = getNthWeekdayOfMonth(
        nextYear,
        normalizedNextMonth,
        weekday,
        occurrence
      );

      if (!targetDate) continue;

      const iso = formatDateLocal(targetDate);

      const { data: existing, error: existingError } = await supabase
        .from("atividades")
        .select("id")
        .eq("division_id", divisionId)
        .eq("data", iso)
        .eq("titulo", task.titulo)
        .maybeSingle();

      if (existingError) {
        console.error(existingError);
        continue;
      }

      if (!existing) {
        inserts.push({
          division_id: divisionId,
          data: iso,
          hora: task.hora,
          titulo: task.titulo,
          prioridade: task.prioridade,
          completed: false,
        });
      }
    }

    if (inserts.length === 0) {
      alert("Nenhuma nova atividade para replicar. Elas já existem no próximo mês.");
      return;
    }

    const { error: insertError } = await supabase
      .from("atividades")
      .insert(inserts);

    if (insertError) {
      console.error(insertError);
      alert("Erro ao replicar atividades.");
      return;
    }

    alert("Atividades replicadas para o próximo mês respeitando o dia da semana.");

    loadTasks();
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col">
        <AppHeader divisionName={division.name} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <MotivationalBar />

          <div className="flex gap-3 items-center">
            <button
              onClick={() => setViewMode("month")}
              className={`px-4 py-2 rounded ${
                viewMode === "month"
                  ? "bg-primary text-white"
                  : "bg-muted"
              }`}
            >
              Mensal
            </button>

            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 rounded ${
                viewMode === "week"
                  ? "bg-primary text-white"
                  : "bg-muted"
              }`}
            >
              Semana
            </button>

            <button
              onClick={replicateNextMonth}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Replicar próximo mês
            </button>
          </div>

          {viewMode === "month" ? (
            <div className="flex gap-6">
              <div className="w-[700px]">
                <MonthlyView
                  calendarData={calendarData}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setViewMode("week");
                  }}
                />
              </div>

              <div className="w-[350px]">
                <MonthlyChart calendarData={calendarData} />
              </div>
            </div>
          ) : (
            <WeeklyView
              calendarData={calendarData}
              setCalendarData={setCalendarData}
              selectedDate={selectedDate}
              divisionId={divisionId}
            />
          )}
        </main>
      </div>
    </div>
  );
}