import { useNavigate, useLocation } from "react-router-dom";
import { divisions } from "@/data/mockData";
import {
  LayoutDashboard,
  LogOut,
  Factory,
  Wrench,
  CalendarDays,
  Boxes,
  Headphones,
  Users,
  FlaskConical,
} from "lucide-react";

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(
    localStorage.getItem("user_profile") || "null"
  );

  const handleLogout = () => {
    localStorage.removeItem("user_profile");
    navigate("/login");
  };

  const divisionIcons: Record<string, any> = {
    central: Factory,
    "gestao-de-pneus": Wrench,
    planejamento: CalendarDays,
    aprovisionamento: Boxes,
    cst: Headphones,
    coordenacao: Users,
    "laboratorio-de-oleo": FlaskConical,
  };

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between">

      <div>
        <div className="p-6 text-white font-bold text-lg border-b border-zinc-800">
          Divisões
        </div>

        <div className="p-4 space-y-2">

          {/* DASHBOARD */}
          {(user?.role === "admin" || user?.role === "coordenador") && (
            <button
              onClick={() => navigate("/dashboard")}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition ${
                location.pathname === "/dashboard"
                  ? "bg-red-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard Executivo
            </button>
          )}

          {/* TODAS AS DIVISÕES PARA ADMIN/COORDENADOR */}
          {(user?.role === "admin" || user?.role === "coordenador") &&
            divisions.map((division) => {
              const Icon =
                divisionIcons[division.id] || Factory;

              return (
                <button
                  key={division.id}
                  onClick={() =>
                    navigate(`/${division.id}`)
                  }
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition ${
                    location.pathname ===
                    `/${division.id}`
                      ? "bg-red-600 text-white"
                      : "text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <Icon size={16} />
                  {division.name}
                </button>
              );
            })}

          {/* USUÁRIO NORMAL SÓ VÊ SUA DIVISÃO */}
          {user?.division_id &&
            user.role !== "admin" &&
            user.role !== "coordenador" && (
              <button
                onClick={() =>
                  navigate(`/${user.division_id}`)
                }
                className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm bg-red-600 text-white"
              >
                <Factory size={16} />
                Minha Divisão
              </button>
            )}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-800"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}