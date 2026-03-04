import { useParams, Navigate } from "react-router-dom";
import { getDivision } from "@/data/mockData";
import { WeeklyView } from "@/components/WeeklyView";
import { MonthlyView } from "@/components/MonthlyView";
import { MonthlyChart } from "@/components/MonthlyChart";
import { MotivationalBar } from "@/components/MotivationalBar";
import { AppHeader } from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
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

  const storageKey = `division-calendar-${division.id}`;

  const [calendarData, setCalendarData] = useState<
    Record<string, any[]>
  >({});

  const [viewMode, setViewMode] = useState<
    "week" | "month"
  >("month");

  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateLocal(new Date())
  );

  // 🔹 carregar dados da memória
  useEffect(() => {

    const saved = localStorage.getItem(storageKey);

    if (saved) {
      setCalendarData(JSON.parse(saved));
    } else {
      setCalendarData({});
    }

  }, [division.id]);

  // 🔹 salvar automaticamente na memória
  useEffect(() => {

    localStorage.setItem(
      storageKey,
      JSON.stringify(calendarData)
    );

  }, [calendarData]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">

        <AppHeader divisionName={division.name} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          <MotivationalBar />

          <div className="flex flex-wrap gap-3">

            <button
              onClick={() => setViewMode("month")}
              className={`px-4 py-2 rounded transition ${
                viewMode === "month"
                  ? "bg-primary text-white"
                  : "bg-muted"
              }`}
            >
              Mensal
            </button>

            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 rounded transition ${
                viewMode === "week"
                  ? "bg-primary text-white"
                  : "bg-muted"
              }`}
            >
              Semana
            </button>

          </div>

          {viewMode === "month" ? (

            <div className="flex flex-col xl:flex-row gap-8 items-start">

              <div className="flex-1 w-full">
                <MonthlyView
                  calendarData={calendarData}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setViewMode("week");
                  }}
                />
              </div>

              <div className="w-full xl:w-[450px]">
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