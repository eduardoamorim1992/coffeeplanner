import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { divisions } from "@/data/mockData";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingTotals, setPendingTotals] = useState<
    Record<string, number>
  >({});

  const user = JSON.parse(
    localStorage.getItem("user_profile") || "null"
  );

  const handleLogout = () => {
    localStorage.removeItem("user_profile");
    navigate("/login");
  };

  const calculateTotals = () => {
    const totals: Record<string, number> = {};

    divisions.forEach((division) => {
      const storageKey = `division-calendar-${division.id}`;
      const saved = localStorage.getItem(storageKey);

      if (!saved) {
        totals[division.id] = 0;
        return;
      }

      const data = JSON.parse(saved);

      let total = 0;

      for (const date in data) {
        const tasks = data[date];
        if (Array.isArray(tasks)) {
          total += tasks.filter(
            (task: any) => !task.completed
          ).length;
        }
      }

      totals[division.id] = total;
    });

    setPendingTotals(totals);
  };

  useEffect(() => {
    calculateTotals();
    const interval = setInterval(calculateTotals, 1000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  return (
    <>
      {/* 🔥 Botão mobile */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-zinc-900 p-2 rounded"
      >
        <Menu size={20} />
      </button>

      {/* Overlay mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${collapsed ? "w-20" : "w-64"}
          fixed md:relative
          z-50 md:z-auto
          h-full
          bg-zinc-950
          border-r border-zinc-800
          transform
          transition-all duration-300
          flex flex-col justify-between
          ${
            isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        {/* 🔹 PARTE SUPERIOR */}
        <div>
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-zinc-800">
            {!collapsed && (
              <span className="text-white font-bold text-lg">
                Divisões
              </span>
            )}

            {/* Desktop toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:block text-zinc-400 hover:text-white"
            >
              {collapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>

            {/* Mobile close */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Menu */}
          <div className="p-2 space-y-2">
            {(user?.role === "admin" ||
              user?.role === "coordenador") && (
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-800"
              >
                <LayoutDashboard size={18} />
                {!collapsed && "Dashboard"}
              </button>
            )}

            {divisions.map((division) => {
              const Icon = division.icon;
              const pending =
                pendingTotals[division.id] || 0;

              return (
                <button
                  key={division.id}
                  onClick={() =>
                    navigate(`/${division.id}`)
                  }
                  className="flex items-center justify-between w-full px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    {!collapsed && division.name}
                  </div>

                  {!collapsed && pending > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-white">
                      {pending}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 🔹 RODAPÉ */}
        <div className="p-2 border-t border-zinc-800 space-y-2">

          {/* ⚙️ BOTÃO CONFIGURAÇÕES (SÓ ADMIN) */}
          {user?.role === "admin" && (
            <button
              onClick={() =>
                navigate("/admin/users")
              }
              className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-800"
            >
              <Settings size={18} />
              {!collapsed && "Configurações"}
            </button>
          )}

          {/* 🚪 SAIR */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-800"
          >
            <LogOut size={18} />
            {!collapsed && "Sair"}
          </button>
        </div>
      </aside>
    </>
  );
}