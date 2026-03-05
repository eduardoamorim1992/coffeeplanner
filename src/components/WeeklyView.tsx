import { WeekCard } from "./WeekCard";
import { supabase } from "@/lib/supabase";

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

export function WeeklyView({
  calendarData,
  setCalendarData,
  selectedDate,
  divisionId
}: Props) {

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
      tasks: calendarData[iso] || [],
    });
  }

  async function addTask(
    dayDate: string,
    title: string,
    priority: "alta" | "media" | "baixa"
  ) {

    if (!divisionId) return;

    const { data } = await supabase
      .from("atividades")
      .insert({
        division_id: divisionId,
        data: dayDate,
        titulo: title,
        prioridade: priority,
        completed: false
      })
      .select()
      .single();

    if (!data) return;

    setCalendarData((prev) => ({
      ...prev,
      [dayDate]: [
        ...(prev[dayDate] || []),
        {
          id: data.id,
          title: data.titulo,
          completed: data.completed,
          priority: data.prioridade
        }
      ]
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

    if (!divisionId) return;

    const start = parseLocalDate(startDate);

    const weekday = start.getDay();
    const month = start.getMonth();
    const year = start.getFullYear();

    const inserts = [];

    for (let d = 1; d <= 31; d++) {

      const date = new Date(year, month, d);

      if (date.getMonth() !== month) break;

      if (date.getDay() === weekday) {

        const iso = formatDateLocal(date);

        const exists = (calendarData[iso] || []).some(
          (t) => t.title === task.title
        );

        if (!exists) {

          inserts.push({
            division_id: divisionId,
            data: iso,
            titulo: task.title,
            prioridade: task.priority,
            completed: false
          });

        }

      }

    }

    if (inserts.length === 0) return;

    const { data } = await supabase
      .from("atividades")
      .insert(inserts)
      .select();

    if (!data) return;

    const updated = { ...calendarData };

    data.forEach((task) => {

      const date = task.data;

      if (!updated[date]) updated[date] = [];

      updated[date].push({
        id: task.id,
        title: task.titulo,
        completed: task.completed,
        priority: task.prioridade
      });

    });

    setCalendarData(updated);
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

          onAddTask={(title, priority) =>
            addTask(day.date, title, priority)
          }

          onReplicateTask={(task) =>
            replicateTask(task, day.date)
          }
        />

      ))}

    </div>
  );
}