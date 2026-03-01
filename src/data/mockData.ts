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

export interface Division {
  id: string;
  name: string;
  icon: string;
  weekData: DayData[];
}

function getWeekDates(): { date: string; dayName: string }[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const days = [
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
    "Domingo",
  ];

  return days.map((dayName, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      dayName,
      date: `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`,
    };
  });
}

const week = getWeekDates();

/* ============================= */
/* LABORATÓRIO DE ÓLEO TASKS */
/* ============================= */

const laboratorioOleoTasks: Task[][] = [
  [
    { id: "lo1", title: "Análise de viscosidade", completed: false, priority: "alta" },
    { id: "lo2", title: "Coleta amostras frota A", completed: true, priority: "media" },
  ],
  [
    { id: "lo3", title: "Relatório contaminação", completed: false, priority: "alta" },
  ],
  [
    { id: "lo4", title: "Inspeção filtro hidráulico", completed: false, priority: "media" },
  ],
  [
    { id: "lo5", title: "Revisar histórico análises", completed: false, priority: "baixa" },
  ],
  [
    { id: "lo6", title: "Enviar relatório semanal", completed: false, priority: "alta" },
  ],
  [],
  [],
];

/* ============================= */
/* FUNÇÃO BUILD */
/* ============================= */

function buildDivision(
  id: string,
  name: string,
  icon: string,
  tasks: Task[][],
  notes: string[]
): Division {
  return {
    id,
    name,
    icon,
    weekData: week.map((day, i) => ({
      ...day,
      tasks: tasks[i] || [],
      notes: notes[i] || "",
    })),
  };
}

/* ============================= */
/* DIVISÕES */
/* ============================= */

export const divisions: Division[] = [
  buildDivision("central", "Central", "LayoutDashboard", [], []),
  buildDivision("gestao-pneus", "Gestão de Pneus", "CircleDot", [], []),
  buildDivision("planejamento", "Planejamento", "CalendarDays", [], []),
  buildDivision("aprovisionamento", "Aprovisionamento", "Package", [], []),
  buildDivision("cst", "CST", "Headset", [], []),
  buildDivision("coordenacao", "Coordenação", "Users", [], []),

  /* 🔥 NOVA DIVISÃO */
  buildDivision(
    "laboratorio-oleo",
    "Laboratório de Óleo",
    "FlaskConical",
    laboratorioOleoTasks,
    [
      "Coletar amostras prioritárias",
      "",
      "Verificar contaminação",
      "",
      "Encerrar análises da semana",
      "",
      "",
    ]
  ),
];

export function getDivision(id: string): Division | undefined {
  return divisions.find((d) => d.id === id);
}