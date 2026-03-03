import { divisions } from "@/data/mockData";
import { RankingBoard } from "@/components/RankingBoard";
import { AlertsPanel } from "@/components/AlertsPanel";
import  AppSidebar  from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [globalCalendarData, setGlobalCalendarData] =
    useState<Record<string, Record<string, any[]>>>(
      {}
    );

  useEffect(() => {
    const data: Record<
      string,
      Record<string, any[]>
    > = {};

    divisions.forEach((division) => {
      const saved = localStorage.getItem(
        `division-calendar-${division.id}`
      );

      data[division.id] = saved
        ? JSON.parse(saved)
        : {};
    });

    setGlobalCalendarData(data);
  }, []);

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader divisionName="Dashboard Executivo" />

        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <RankingBoard
              globalCalendarData={
                globalCalendarData
              }
            />

            <AlertsPanel
              globalCalendarData={
                globalCalendarData
              }
            />
          </div>
        </main>
      </div>
    </div>
  );
}