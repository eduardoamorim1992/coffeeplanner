import { WeekCard } from "./WeekCard";

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface Props {
  calendarData: Record<string, any[]>;
  setCalendarData: React.Dispatch<
    React.SetStateAction<Record<string, any[]>>
  >;
  selectedDate: string;
}

export function WeeklyView({
  calendarData,
  setCalendarData,
  selectedDate,
}: Props) {
  const baseDate = parseLocalDate(selectedDate);

  const monday = new Date(baseDate);
  monday.setDate(
    baseDate.getDate() - ((baseDate.getDay() + 6) % 7)
  );

  const week = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const iso = formatDateLocal(d);

    week.push({
      date: iso,
      dayName: d.toLocaleDateString("pt-BR", {
        weekday: "long",
      }),
      tasks: calendarData[iso] || [],
      notes: "",
    });
  }

  // ✅ CONCLUIR TAREFA
  function toggleTask(dayDate: string, taskId: string) {
    setCalendarData((prev) => ({
      ...prev,
      [dayDate]: prev[dayDate].map((task: any) =>
        task.id === taskId
          ? { ...task, completed: !task.completed }
          : task
      ),
    }));
  }

  // ✅ EXCLUIR TAREFA
  function deleteTask(dayDate: string, taskId: string) {
    setCalendarData((prev) => ({
      ...prev,
      [dayDate]: prev[dayDate].filter(
        (task: any) => task.id !== taskId
      ),
    }));
  }

  // ✅ ADICIONAR TAREFA
  function addTask(
    dayDate: string,
    title: string,
    priority: "alta" | "media" | "baixa"
  ) {
    if (!title.trim()) return;

    setCalendarData((prev) => ({
      ...prev,
      [dayDate]: [
        ...(prev[dayDate] || []),
        {
          id: crypto.randomUUID(),
          title,
          completed: false,
          priority,
        },
      ],
    }));
  }

  // 🔥 REPLICAR EM TODAS AS MESMAS SEMANAS DO MÊS
  function replicateTaskWeekly(
    task: any,
    baseDate: string
  ) {
    const base = parseLocalDate(baseDate);
    const targetWeekDay = base.getDay();
    const month = base.getMonth();
    const year = base.getFullYear();

    setCalendarData((prev) => {
      const newCalendar = { ...prev };

      const daysInMonth = new Date(
        year,
        month + 1,
        0
      ).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const current = new Date(year, month, day);

        if (current.getDay() === targetWeekDay) {
          const formatted = formatDateLocal(current);

          if (!newCalendar[formatted]) {
            newCalendar[formatted] = [];
          }

          const alreadyExists =
            newCalendar[formatted].some(
              (t: any) => t.title === task.title
            );

          if (!alreadyExists) {
            newCalendar[formatted].push({
              ...task,
              id: crypto.randomUUID(),
              completed: false,
            });
          }
        }
      }

      return newCalendar;
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {week.map((day, i) => (
        <WeekCard
          key={day.date}
          day={day}
          isToday={false}
          index={i}
          onToggleTask={(taskId) =>
            toggleTask(day.date, taskId)
          }
          onDeleteTask={(taskId) =>
            deleteTask(day.date, taskId)
          }
          onAddTask={(title, priority) =>
            addTask(day.date, title, priority)
          }
          onReplicateTask={(task) =>
            replicateTaskWeekly(task, day.date)
          }
        />
      ))}
    </div>
  );
}