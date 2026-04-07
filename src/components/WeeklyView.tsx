import { WeekCard } from "./WeekCard";
import { ReplicateTaskDialog } from "./ReplicateTaskDialog";
import { supabase } from "@/lib/supabase";
import { useRef, useState } from "react";
import {
  sortDayTasks,
  toggleCalendarDayTask,
  type CalendarTask,
} from "@/lib/calendarDayTasks";

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

interface Props {
  calendarData: Record<string, CalendarTask[]>;
  setCalendarData: React.Dispatch<
    React.SetStateAction<Record<string, CalendarTask[]>>
  >;
  selectedDate: string;
}

export function WeeklyView({
  calendarData,
  setCalendarData,
  selectedDate,
}: Props) {
  const [replicateTarget, setReplicateTarget] = useState<{
    task: CalendarTask;
    sourceDate: string;
  } | null>(null);

  const notifiedTasks = useRef<Set<string>>(new Set());

  async function getUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .single();

    if (error || !data) return null;

    return data.id;
  }

  const baseDate = parseLocalDate(selectedDate);

  const monday = new Date(baseDate);
  monday.setDate(
    baseDate.getDate() - ((baseDate.getDay() + 6) % 7)
  );

  const week: any[] = [];

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
      tasks: sortDayTasks(calendarData[iso] || []),
    });
  }

  function normalizePriority(p: string) {
    if (!p) return "media";
    if (p.toLowerCase().includes("alta")) return "alta";
    if (p.toLowerCase().includes("baixa")) return "baixa";
    return "media";
  }

  async function addTask(
    dayDate: string,
    title: string,
    priority: any,
    time: string
  ) {

    if (!title) {
      alert("Digite uma atividade");
      return;
    }

    const userId = await getUserId();

    if (!userId) {
      alert("Usuário não identificado");
      return;
    }

    const safeTime =
      time && time !== "--:--" ? time : null;

    const safePriority = normalizePriority(priority);

    const { data, error } = await supabase
      .from("atividades")
      .insert({
        user_id: userId,
        data: dayDate,
        hora: safeTime,
        titulo: title,
        prioridade: safePriority,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error("ERRO:", error);
      alert("Erro ao salvar atividade");
      return;
    }

    setCalendarData((prev) => ({
      ...prev,
      [dayDate]: sortDayTasks([
        ...(prev[dayDate] || []),
        {
          id: data.id,
          title: data.titulo,
          time: data.hora ? data.hora.slice(0, 5) : null, // 🔥 SEM SEGUNDOS
          completed: data.completed,
          priority: data.prioridade,
        },
      ]),
    }));
  }

  async function editTask(dayDate: string, task: CalendarTask) {
    const nextTitleRaw = window.prompt(
      "Editar descrição da atividade:",
      task.title
    );
    if (nextTitleRaw === null) return;

    const nextTitle = nextTitleRaw.trim();
    if (!nextTitle) {
      alert("A descrição não pode ficar vazia.");
      return;
    }

    const nextTimeRaw = window.prompt(
      "Editar horário (HH:MM). Deixe vazio para remover:",
      task.time || ""
    );
    if (nextTimeRaw === null) return;

    const nextTime = nextTimeRaw.trim();
    const safeTime = nextTime ? nextTime : null;

    const { error } = await supabase
      .from("atividades")
      .update({
        titulo: nextTitle,
        hora: safeTime,
      })
      .eq("id", task.id);

    if (error) {
      console.error("Erro ao editar atividade:", error);
      alert("Não foi possível editar a atividade.");
      return;
    }

    setCalendarData((prev) => ({
      ...prev,
      [dayDate]: sortDayTasks(
        (prev[dayDate] || []).map((t) =>
          t.id === task.id
            ? {
                ...t,
                title: nextTitle,
                time: safeTime,
              }
            : t
        )
      ),
    }));
  }

  async function toggleTask(dayDate: string, taskId: string) {
    await toggleCalendarDayTask(
      dayDate,
      taskId,
      calendarData,
      setCalendarData
    );
  }

  async function deleteTask(dayDate: string, taskId: string) {

    await supabase
      .from("atividades")
      .delete()
      .eq("id", taskId);

    setCalendarData((prev) => ({
      ...prev,
      [dayDate]: (prev[dayDate] || []).filter(
        (t) => t.id !== taskId
      ),
    }));
  }

  async function replicateTask(
    task: CalendarTask,
    startDate: string,
    weekdays: Set<number>
  ) {
    const userId = await getUserId();
    if (!userId || weekdays.size === 0) return;

    const start = parseLocalDate(startDate);
    const month = start.getMonth();
    const year = start.getFullYear();

    const monthStart = formatDateLocal(new Date(year, month, 1));
    const monthEnd = formatDateLocal(new Date(year, month + 1, 0));

    const { data: existingRows } = await supabase
      .from("atividades")
      .select("data, hora, titulo, prioridade")
      .eq("user_id", userId)
      .gte("data", monthStart)
      .lte("data", monthEnd);

    const makeKey = (
      iso: string,
      hora: string | null,
      titulo: string,
      prioridade: string
    ) => `${iso}|${hora || ""}|${titulo}|${prioridade}`;

    const existingKeys = new Set(
      (existingRows || []).map((row: any) =>
        makeKey(row.data, row.hora, row.titulo, row.prioridade)
      )
    );

    const inserts: any[] = [];
    const insertKeys = new Set<string>();

    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month, day);
      if (date.getMonth() !== month) break;
      if (!weekdays.has(date.getDay())) continue;

      const iso = formatDateLocal(date);
      const hora = task.time || null;
      const k = makeKey(iso, hora, task.title, task.priority);

      if (iso === startDate) continue;
      if (existingKeys.has(k) || insertKeys.has(k)) continue;

      inserts.push({
        user_id: userId,
        data: iso,
        hora,
        titulo: task.title,
        prioridade: task.priority,
        completed: false,
      });

      insertKeys.add(k);
    }

    if (inserts.length === 0) {
      alert(
        "Nenhuma data nova neste mês para os dias escolhidos (tudo já existe ou só há o dia de origem)."
      );
      return;
    }

    const { data, error: insertError } = await supabase
      .from("atividades")
      .insert(inserts)
      .select();

    if (insertError) {
      console.error(insertError);
      alert("Não foi possível replicar as atividades. Tente novamente.");
      return;
    }

    const updated = { ...calendarData };

    data?.forEach((t: any) => {
      if (!updated[t.data]) updated[t.data] = [];
      updated[t.data].push({
        id: t.id,
        title: t.titulo,
        time: t.hora ? t.hora.slice(0, 5) : null,
        completed: t.completed,
        priority: t.prioridade,
      });
      updated[t.data] = sortDayTasks(updated[t.data]);
    });

    setCalendarData(updated);
  }

  return (
    <div className="w-full min-w-0 pb-2 pb-safe md:pb-2">
      {replicateTarget ? (
        <ReplicateTaskDialog
          task={replicateTarget.task}
          sourceDate={replicateTarget.sourceDate}
          week={week}
          onClose={() => setReplicateTarget(null)}
          onConfirm={(weekdays) => {
            const payload = replicateTarget;
            setReplicateTarget(null);
            if (payload) void replicateTask(payload.task, payload.sourceDate, weekdays);
          }}
        />
      ) : null}

      <div className="grid w-full min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:grid-cols-7 lg:gap-3 [&>*]:min-w-0">
        {week.map((day, i) => (
          <WeekCard
            key={day.date}
            day={day}
            isToday={false}
            index={i}
            onToggleTask={(id) => toggleTask(day.date, id)}
            onDeleteTask={(id) => deleteTask(day.date, id)}
            onAddTask={(t, p, time) => addTask(day.date, t, p, time)}
            onReplicateTask={(task) =>
              setReplicateTarget({ task, sourceDate: day.date })
            }
            onEditTask={(task) => editTask(day.date, task)}
          />
        ))}
      </div>
    </div>
  );
}