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
        completed: task.completed,
        priority: task.prioridade
      });

    });

    setCalendarData(grouped);

  }

  useEffect(() => {
    loadTasks();
  }, [divisionId]);

  return (
    <div className="flex h-screen bg-background">

      <AppSidebar />

      <div className="flex-1 flex flex-col">

        <AppHeader divisionName={division.name} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          <MotivationalBar />

          <div className="flex gap-3">

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

          </div>

          {viewMode === "month" ? (

            <div className="flex gap-6">

              {/* CALENDÁRIO */}
              <div className="w-[700px]">

                <MonthlyView
                  calendarData={calendarData}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setViewMode("week");
                  }}
                />

              </div>

              {/* GRÁFICO */}
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