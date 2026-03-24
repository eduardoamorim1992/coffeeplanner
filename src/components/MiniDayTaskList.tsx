import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import {
  sortDayTasks,
  toggleCalendarDayTask,
  type CalendarTask,
} from "@/lib/calendarDayTasks";

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

interface Props {
  isoDate: string;
  calendarData: Record<string, CalendarTask[]>;
  setCalendarData: React.Dispatch<
    React.SetStateAction<Record<string, CalendarTask[]>>
  >;
  onOpenWeek: () => void;
}

const priorityColors = {
  alta: "text-red-500",
  media: "text-blue-500",
  baixa: "text-gray-400",
};

const priorityBackground = {
  alta: "bg-red-500/10",
  media: "bg-blue-500/10",
  baixa: "bg-gray-500/10",
};

export function MiniDayTaskList({
  isoDate,
  calendarData,
  setCalendarData,
  onOpenWeek,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const todayIso = formatDateLocal(new Date());
  const isToday = isoDate === todayIso;

  const parsed = parseLocalDate(isoDate);
  const longLabel = parsed.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const tasks = sortDayTasks(calendarData[isoDate] || []);
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;

  async function onToggle(taskId: string) {
    if (busyId) return;
    setBusyId(taskId);
    await toggleCalendarDayTask(
      isoDate,
      taskId,
      calendarData,
      setCalendarData
    );
    setBusyId(null);
  }

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-sm flex flex-col min-h-[180px] max-h-[min(70vh,520px)] lg:sticky lg:top-4">
      <div className="px-3 sm:px-4 py-3 border-b border-zinc-800/80 space-y-1 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Atividades do dia
            </p>
            <p className="text-sm font-semibold text-zinc-100 leading-snug capitalize truncate">
              {longLabel}
            </p>
          </div>
          {isToday ? (
            <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Hoje
            </span>
          ) : null}
        </div>
        {total > 0 ? (
          <p className="text-[11px] text-zinc-500">
            {done}/{total} concluída{total === 1 ? "" : "s"}
          </p>
        ) : (
          <p className="text-[11px] text-zinc-500">Nenhuma atividade</p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 sm:px-3 py-2 space-y-1.5">
        {tasks.length === 0 ? (
          <p className="text-xs text-zinc-500 px-1 py-2">
            Sem atividades neste dia. Escolha outro dia no calendário ou abra a
            visão semanal para criar tarefas.
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-2 rounded-lg px-2 py-1.5 transition ${
                task.completed
                  ? "bg-green-500/15"
                  : priorityBackground[task.priority]
              }`}
            >
              <button
                type="button"
                disabled={busyId === task.id}
                onClick={() => onToggle(task.id)}
                className="flex items-start gap-2 text-left min-w-0 flex-1 disabled:opacity-60"
                title={task.completed ? "Desmarcar" : "Concluir"}
              >
                {task.completed ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500 mt-0.5" />
                ) : (
                  <Circle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${priorityColors[task.priority]}`}
                  />
                )}
                <span
                  className={`text-[12px] leading-snug break-words ${
                    task.completed
                      ? "line-through text-zinc-500"
                      : "text-zinc-200"
                  }`}
                >
                  {task.time ? (
                    <span className="text-[10px] text-zinc-500 font-mono mr-1 tabular-nums">
                      {task.time}
                    </span>
                  ) : null}
                  {task.title}
                </span>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-3 py-2 border-t border-zinc-800/80 shrink-0">
        <button
          type="button"
          onClick={onOpenWeek}
          className="w-full min-h-[40px] rounded-lg border border-zinc-700/80 bg-zinc-900/50 text-xs font-medium text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition active:scale-[0.99]"
        >
          Abrir visão semanal
        </button>
      </div>
    </div>
  );
}
