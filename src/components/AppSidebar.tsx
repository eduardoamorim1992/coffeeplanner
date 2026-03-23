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

    console.log("🔥 auth:", user.email);

    const { data: meData, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", user.email)
      .single();

    if (error || !meData) {
      console.error("Erro ao buscar usuário:", error);
      return;
    }

    console.log("🔥 DB user:", meData);

    setMe(meData);

    const role = (meData.role || "").toLowerCase().trim();

    // 🔥 ADMIN / COORDENADOR → VÊ TODOS
    if (role === "admin" || role === "coordenador") {
      const { data } = await supabase
        .from("users")
        .select("id, nome, role")
        .order("nome");

      setUsers(data || []);
    } else {
      // 🔥 ANALISTA → SÓ ELE
      setUsers([meData]);
    }
  }

  // 🔥 CONTADOR DE PENDENTES
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
    if (user) {
      loadUsers();
    }
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
      {/* MOBILE BUTTON */}
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

      {/* SIDEBAR */}
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
          {/* HEADER */}
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

            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden"
            >
              <X />
            </button>
          </div>

          {/* MENU */}
          <div className="p-2 space-y-2">

            {/* DASHBOARD (SÓ ADMIN/COORDENADOR) */}
            {me &&
              (me.role?.toLowerCase().trim() === "admin" ||
                me.role?.toLowerCase().trim() === "coordenador") && (
                <button
                  onClick={() => navigate("/dashboard")}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded text-sm transition
                  ${
                    location.pathname === "/dashboard"
                      ? "bg-red-600 text-white"
                      : "text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <LayoutDashboard size={18} />
                  {!collapsed && "Dashboard"}
                </button>
              )}

            {/* USERS */}
            {users.map((u) => {
              const pending = pendingTotals[u.id] || 0;
              const isActive =
                location.pathname === `/user/${u.id}`;

              return (
                <button
                  key={u.id}
                  onClick={() => navigate(`/user/${u.id}`)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded text-sm transition
                  ${
                    isActive
                      ? "bg-red-600 text-white"
                      : "text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User size={18} />

                    {!collapsed && (
                      <div className="flex flex-col text-left">
                        <span>{u.nome}</span>
                        <span className="text-[10px] text-zinc-500">
                          {u.role}
                        </span>
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

        {/* FOOTER */}
        <div className="p-2 border-t border-zinc-800 space-y-2">

          {me?.role?.toLowerCase().trim() === "admin" && (
            <button
              onClick={() => navigate("/admin/users")}
              className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-800"
            >
              <Settings size={18} />
              {!collapsed && "Configurações"}
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