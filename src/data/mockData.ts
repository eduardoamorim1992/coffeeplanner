import { LucideIcon, User } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "alta" | "media" | "baixa";
}

export interface DayData {
  date: string;
  dayName: string;
  tasks: Task[];
  notes: string;
}

// 🔥 NOVO: divisão agora é usuário
export interface Division {
  id: string;
  name: string;
  role: string;
}