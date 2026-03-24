import type { Dispatch, SetStateAction } from "react";
import { supabase } from "@/lib/supabase";

export type CalendarTask = {
  id: string;
  title: string;
  time?: string | null;
  completed: boolean;
  priority: "alta" | "media" | "baixa";
};

export function sortDayTasks(tasks: CalendarTask[]): CalendarTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

export async function toggleCalendarDayTask(
  dayDate: string,
  taskId: string,
  calendarData: Record<string, CalendarTask[]>,
  setCalendarData: Dispatch<SetStateAction<Record<string, CalendarTask[]>>>
): Promise<void> {
  const tasks = calendarData[dayDate] || [];
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const newStatus = !task.completed;

  const { error } = await supabase
    .from("atividades")
    .update({ completed: newStatus })
    .eq("id", taskId);

  if (error) {
    console.error("toggleCalendarDayTask:", error);
    return;
  }

  setCalendarData((prev) => ({
    ...prev,
    [dayDate]: sortDayTasks(
      (prev[dayDate] || []).map((t) =>
        t.id === taskId ? { ...t, completed: newStatus } : t
      )
    ),
  }));
}
