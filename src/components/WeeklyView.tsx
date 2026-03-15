import { WeekCard } from "./WeekCard";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateBR(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

interface Task {
  id: string;
  title: string;
  time?: string;
  completed: boolean;
  priority: "alta" | "media" | "baixa";
}

interface Props {
  calendarData: Record<string, Task[]>;
  setCalendarData: React.Dispatch<
    React.SetStateAction<Record<string, Task[]>>
  >;
  selectedDate: string;
  divisionId?: string;
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

function showNotification(title: string) {

  if (Notification.permission === "granted") {

    new Notification("⏰ Atividade em 10 minutos", {
      body: title
    });

  }

}

export function WeeklyView({
  calendarData,
  setCalendarData,
  selectedDate,
  divisionId
}: Props) {

  const notifiedTasks = useRef<Set<string>>(new Set());

  /* PEDIR PERMISSÃO */
  useEffect(() => {

    if ("Notification" in window) {

      Notification.requestPermission().then((permission) => {
        console.log("Permissão:", permission);
      });

    }

  }, []);

  /* SISTEMA DE ALERTA */
  useEffect(() => {

    const interval = setInterval(() => {

      const now = new Date();

      const today = formatDateLocal(now);

      const tasksToday = calendarData[today] || [];

      tasksToday.forEach((task) => {

        if (!task.time) return;

        const [hour, minute] = task.time.split(":").map(Number);

        const taskDate = new Date();
        taskDate.setHours(hour);
        taskDate.setMinutes(minute);
        taskDate.setSeconds(0);

        const diff = taskDate.getTime() - now.getTime();

        const tenMinutes = 10 * 60 * 1000;

        console.log("verificando tarefa:", task.title);

        if (
          diff <= tenMinutes &&
          diff > 0 &&
          !notifiedTasks.current.has(task.id)
        ) {

          showNotification(task.title);

          notifiedTasks.current.add(task.id);

        }

      });

    }, 30000);

    return () => clearInterval(interval);

  }, [calendarData]);

  const baseDate = parseLocalDate(selectedDate);

  const monday = new Date(baseDate);
  monday.setDate(
    baseDate.getDate() - ((baseDate.getDay() + 6) % 7)
  );

  const week: {
    date: string;
    displayDate: string;
    dayName: string;
    tasks: Task[];
  }[] = [];

  for (let i = 0; i < 7; i++) {

    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const iso = formatDateLocal(d);

    week.push({
      date: iso,
      displayDate: formatDateBR(iso),
      dayName: d.toLocaleDateString("pt-BR", {
        weekday: "long",
      }),
      tasks: sortTasks(calendarData[iso] || []),
    });

  }

  async function addTask(
    dayDate: string,
    title: string,
    priority: "alta" | "media" | "baixa",
    time: string
  ) {

    if (!divisionId) return;

    const { data } = await supabase
      .from("atividades")
      .insert({
        division_id: divisionId,
        data: dayDate,
        hora: time,
        titulo: title,
        prioridade: priority,
        completed: false
      })
      .select()
      .single();

    if (!data) return;

    setCalendarData((prev) => ({
      ...prev,
      [dayDate]: sortTasks([
        ...(prev[dayDate] || []),
        {
          id: data.id,
          title: data.titulo,
          time: data.hora,
          completed: data.completed,
          priority: data.prioridade
        }
      ])
    }));

  }

  async function toggleTask(dayDate: string, taskId: string) {

    const tasks = calendarData[dayDate] || [];
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    await supabase
      .from("atividades")
      .update({
        completed: !task.completed
      })
      .eq("id", taskId);

    setCalendarData((prev) => ({
      ...prev,
      [dayDate]: (prev[dayDate] || []).map((task) =>
        task.id === taskId
          ? { ...task, completed: !task.completed }
          : task
      ),
    }));

  }

  async function deleteTask(dayDate: string, taskId: string) {

    await supabase
      .from("atividades")
      .delete()
      .eq("id", taskId);

    setCalendarData((prev) => ({
      ...prev,
      [dayDate]: (prev[dayDate] || []).filter(
        (task) => task.id !== taskId
      ),
    }));

  }

  async function replicateTask(task: Task, startDate: string) {
    console.log("replicando:", task.title);
  }

  return (

    <div className="flex gap-4 overflow-x-auto pb-4">

      {week.map((day, i) => (

        <WeekCard
          key={day.date}
          day={day}
          isToday={false}
          index={i}

          onToggleTask={(taskId: string) =>
            toggleTask(day.date, taskId)
          }

          onDeleteTask={(taskId: string) =>
            deleteTask(day.date, taskId)
          }

          onAddTask={(title, priority, time) =>
            addTask(day.date, title, priority, time)
          }

          onReplicateTask={(task) =>
            replicateTask(task, day.date)
          }

        />

      ))}

    </div>

  );

}