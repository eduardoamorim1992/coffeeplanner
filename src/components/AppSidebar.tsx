import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
} from "lucide-react";

// 🔥 HOOK AUTH
function useAuthUser() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user };
}

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useAuthUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingTotals, setPendingTotals] = useState<Record<string, number>>({});
  const [me, setMe] = useState<any>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // 🔥 CARREGAR USUÁRIOS COM PERMISSÃO
  async function loadUsers() {
    if (!user) return;

    const { data: meData } = await supabase
      .from("users")
      .select("*")
      .eq("email", user.email)
      .single();

    if (!meData) return;

    setMe(meData);

    const role = String(meData.role || "").toLowerCase().trim();

    // 🔥 ADMIN → TODOS
    if (role === "admin") {
      const { data } = await supabase
        .from("users")
        .select("id, nome, role")
        .order("nome");

      setUsers(data || []);
    }

    // 🔥 GESTOR → EQUIPE
    else if (
      role === "coordenador" ||
      role === "supervisor" ||
      role === "gerente"
    ) {
      const { data: relations } = await supabase
        .from("user_managers")
        .select("user_id")
        .eq("manager_id", meData.id);

      const ids = [meData.id, ...(relations?.map((r) => r.user_id) || [])];

      const { data } = await supabase
        .from("users")
        .select("id, nome, role")
        .in("id", ids)
        .order("nome");

      setUsers(data || []);
    }

    // 🔥 USUÁRIO NORMAL
    else {
      setUsers([meData]);
    }
  }

  // 🔥 CONTADOR
  async function calculateTotals() {
    const totals: Record<string, number> = {};

    for (const u of users) {
      const { count } = await supabase
        .from("atividades")
        .select("*", { count: "exact", head: true })
        .eq("user_id", u.id)
        .eq("completed", false);

      totals[u.id] = count || 0;
    }

    setPendingTotals(totals);
  }

  useEffect(() => {
    if (user) loadUsers();
  }, [user]);

  useEffect(() => {
    if (users.length > 0) {
      calculateTotals();

      const interval = setInterval(() => {
        calculateTotals();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [users, location.pathname]);

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-zinc-900 p-2 rounded"
      >
        <Menu size={20} />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`
          ${collapsed ? "w-20" : "w-64"}
          fixed md:relative
          h-full
          bg-zinc-950
          border-r border-zinc-800
          transition-all duration-300
          flex flex-col justify-between
          ${
            isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        <div>
          <div className="p-4 flex items-center justify-between border-b border-zinc-800">
            {!collapsed && (
              <span className="text-white font-bold text-lg">
                Usuários
              </span>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:block text-zinc-400 hover:text-white"
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>

            <button onClick={() => setIsMobileOpen(false)} className="md:hidden">
              <X />
            </button>
          </div>

          <div className="p-2 space-y-2">
            {/* DASHBOARD */}
            {me?.role === "admin" && (
              <button
                onClick={() => navigate("/dashboard")}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded text-sm ${
                  location.pathname === "/dashboard"
                    ? "bg-red-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                <LayoutDashboard size={18} />
                {!collapsed && "Dashboard"}
              </button>
            )}

            {/* USUÁRIOS */}
            {users.map((u) => {
              const pending = pendingTotals[u.id] || 0;
              const isActive = location.pathname === `/user/${u.id}`;

              return (
                <button
                  key={u.id}
                  onClick={() => navigate(`/user/${u.id}`)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded text-sm ${
                    isActive
                      ? "bg-red-600 text-white"
                      : "text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User size={18} />

                    {!collapsed && (
                      <div>
                        <div>{u.nome}</div>
                        <div className="text-xs text-zinc-500">
                          {u.role}
                        </div>
                      </div>
                    )}
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

        {/* 🔥 FOOTER COM CONFIGURAÇÕES */}
        <div className="p-2 border-t border-zinc-800 space-y-2">
          {me?.role === "admin" && (
            <button
              onClick={() => navigate("/admin/users")}
              className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-800"
            >
              <Settings size={18} />
              {!collapsed && "Gerenciar Usuários"}
            </button>
          )}

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