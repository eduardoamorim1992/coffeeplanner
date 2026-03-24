import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Trash2,
  Repeat,
  Pencil,
} from "lucide-react";

interface WeekCardProps {
  day: {
    date: string;
    displayDate: string;
    dayName: string;
    tasks: any[];
  };
  isToday: boolean;
  index: number;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (
    title: string,
    priority: "alta" | "media" | "baixa",
    time: string
  ) => void;
  onReplicateTask: (task: any) => void;
  onEditTask: (task: any) => void;
}

export function WeekCard({
  day,
  isToday,
  index,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onReplicateTask,
  onEditTask,
}: WeekCardProps) {

  const [newTask, setNewTask] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [priority, setPriority] =
    useState<"alta" | "media" | "baixa">("media");

  const completedCount = day.tasks.filter(
    (t) => t.completed
  ).length;

  const totalCount = day.tasks.length;

  const progress =
    totalCount > 0
      ? (completedCount / totalCount) * 100
      : 0;

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

  return (
    <div
      className={`glass-card flex flex-col w-full min-w-0 flex-1 transition-all duration-300 ${
        isToday ? "border-primary/50 glow-red" : ""
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >

      {/* HEADER */}
      <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold capitalize">
            {day.dayName}
          </p>

          <p className="text-[10px] text-muted-foreground font-mono">
            {day.displayDate}
          </p>
        </div>

        {totalCount > 0 && (
          <div className="text-[10px] font-mono text-muted-foreground">
            {Math.round(progress)}%
          </div>
        )}
      </div>

      {/* BARRA PROGRESSO */}
      {totalCount > 0 && (
        <div className="px-4 pt-1">
          <div className="w-full h-1 bg-muted/40 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* TASKS */}
      <div className="px-4 py-2 flex-1 space-y-[6px]">

        {day.tasks.map((task) => (

          <div
            key={task.id}
            className={`flex items-start justify-between group rounded px-2 py-0.5 transition
            ${
              task.completed
                ? "bg-green-500/20"
                : priorityBackground[task.priority]
            }`}
          >

            <div className="flex items-start gap-1 text-[11px] flex-1">

              <button
                onClick={() =>
                  onToggleTask(task.id)
                }
                className="flex items-start gap-1 text-left"
              >

                {task.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-500 mt-[1px]" />
                ) : (
                  <Circle
                    className={`w-3.5 h-3.5 flex-shrink-0 mt-[1px] ${priorityColors[task.priority]}`}
                  />
                )}

                <span
                  className={`leading-tight ${
                    task.completed
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >

                  {task.time && (
                    <span className="text-[9px] text-muted-foreground mr-1">
                      {task.time}
                    </span>
                  )}

                  {task.title}

                </span>

              </button>

            </div>

            {/* AÇÕES */}
            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">

              <button
                onClick={() =>
                  onEditTask(task)
                }
                title="Editar atividade"
              >
                <Pencil className="w-3 h-3 text-amber-400 hover:text-amber-300" />
              </button>

              <button
                onClick={() =>
                  onReplicateTask(task)
                }
                title="Replicar no mês"
              >
                <Repeat className="w-3 h-3 text-blue-400 hover:text-blue-300" />
              </button>

              <button
                onClick={() =>
                  onDeleteTask(task.id)
                }
              >
                <Trash2 className="w-3 h-3 text-red-500 hover:text-red-400" />
              </button>

            </div>

          </div>

        ))}

        {/* ADD TASK */}
        <div className="flex flex-col gap-1 pt-1">

          <input
            type="text"
            value={newTask}
            onChange={(e) =>
              setNewTask(e.target.value)
            }
            placeholder="Nova atividade..."
            className="text-[11px] px-2 py-0.5 rounded bg-muted/30 border border-border"
          />

          <input
            type="time"
            value={taskTime}
            onChange={(e) =>
              setTaskTime(e.target.value)
            }
            className="text-[11px] px-2 py-0.5 rounded bg-muted/30 border border-border"
          />

          <select
            value={priority}
            onChange={(e) =>
              setPriority(
                e.target.value as
                  | "alta"
                  | "media"
                  | "baixa"
              )
            }
            className="text-[11px] px-2 py-0.5 rounded bg-muted/30 border border-border"
          >
            <option value="alta">Alta prioridade</option>
            <option value="media">Média prioridade</option>
            <option value="baixa">Baixa prioridade</option>
          </select>

          <button
            type="button"
            onClick={() => {

              if (!newTask.trim()) return;

              onAddTask(newTask, priority, taskTime);

              setNewTask("");
              setTaskTime("");

            }}
            className="min-h-[40px] sm:min-h-0 text-[11px] sm:text-[11px] px-3 py-2 sm:px-2 sm:py-0.5 rounded-lg sm:rounded bg-primary text-white hover:opacity-90 active:scale-[0.98] transition w-full sm:w-auto font-medium"
          >
            Adicionar
          </button>

        </div>

      </div>

      {/* FOOTER */}
      {totalCount > 0 && (
        <div className="px-4 py-1 border-t border-border/30">
          <p className="text-[9px] text-muted-foreground font-mono">
            {completedCount}/{totalCount} concluídas
          </p>
        </div>
      )}

    </div>
  );
}