import { useTaskReminders } from "@/hooks/useTaskReminders";

/** Componente invisível: roda o motor de lembretes no app inteiro. */
export function TaskReminders() {
  useTaskReminders();
  return null;
}
