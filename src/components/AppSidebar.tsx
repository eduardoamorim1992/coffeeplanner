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
  KeyRound,
} from "lucide-react";

// Hierarquia de cargos — cima = maior nível, baixo = menor nível
const ROLE_HIERARCHY = [
  "admin",
  "gerente",
  "supervisor",
  "coordenador",
  "analista",
  "assistente",
];

function sortUsersByHierarchy<T extends { nome?: string; role?: string }>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    const roleA = String(a.role || "").toLowerCase().trim();
    const roleB = String(b.role || "").toLowerCase().trim();
    const idxA = ROLE_HIERARCHY.indexOf(roleA);
    const idxB = ROLE_HIERARCHY.indexOf(roleB);
    const posA = idxA === -1 ? 999 : idxA;
    const posB = idxB === -1 ? 999 : idxB;
    if (posA !== posB) return posA - posB;
    return (a.nome || "").localeCompare(b.nome || "");
  });
}

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
        type="button"
        aria-label="Abrir menu"
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed z-50 touch-target rounded-xl bg-zinc-900/95 border border-zinc-700 shadow-lg backdrop-blur-sm"
        style={{
          top: "max(0.75rem, env(safe-area-inset-top, 0px))",
          left: "max(0.75rem, env(safe-area-inset-left, 0px))",
        }}
      >
        <Menu size={22} className="text-white" />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`
          ${collapsed ? "w-20" : "w-[min(100vw-3rem,18rem)] sm:w-64"}
          fixed md:relative
          h-full max-h-[100dvh]
          bg-zinc-950
          border-r border-zinc-800
          transition-all duration-300 ease-out
          flex flex-col justify-between
          z-50 md:z-auto
          shadow-2xl md:shadow-none
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

          <div className="p-2 space-y-2 flex-1 overflow-y-auto min-h-0 overscroll-contain pb-safe md:pb-2">
            {/* DASHBOARD */}
            {(me?.role === "admin" ||
              ["coordenador", "supervisor", "gerente"].includes(
                String(me?.role || "").toLowerCase().trim()
              )) && (
              <button
                type="button"
                onClick={() => {
                  navigate("/dashboard");
                  setIsMobileOpen(false);
                }}
                className={`flex items-center gap-3 w-full min-h-[44px] px-3 py-2.5 rounded-lg text-sm active:bg-zinc-800/80 ${
                  location.pathname === "/dashboard"
                    ? "bg-red-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                <LayoutDashboard size={18} />
                {!collapsed && "Dashboard"}
              </button>
            )}

            {/* USUÁRIOS — ordenados por hierarquia */}
            {sortUsersByHierarchy(users).map((u) => {
              const pending = pendingTotals[u.id] || 0;
              const isActive = location.pathname === `/user/${u.id}`;

              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => {
                    navigate(`/user/${u.id}`);
                    setIsMobileOpen(false);
                  }}
                  className={`flex items-center justify-between w-full min-h-[44px] px-3 py-2.5 rounded-lg text-sm active:bg-zinc-800/80 ${
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
        <div className="p-2 border-t border-zinc-800 space-y-2 pb-safe md:pb-2 shrink-0">
          {me?.role === "admin" && (
            <button
              type="button"
              onClick={() => {
                navigate("/admin/users");
                setIsMobileOpen(false);
              }}
              className="flex items-center gap-3 w-full min-h-[44px] px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 active:bg-zinc-800/80"
            >
              <Settings size={18} />
              {!collapsed && "Gerenciar Usuários"}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              navigate("/alterar-senha");
              setIsMobileOpen(false);
            }}
            className="flex items-center gap-3 w-full min-h-[44px] px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 active:bg-zinc-800/80"
          >
            <KeyRound size={18} />
            {!collapsed && "Alterar senha"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMobileOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-3 w-full min-h-[44px] px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 active:bg-zinc-800/80"
          >
            <LogOut size={18} />
            {!collapsed && "Sair"}
          </button>
        </div>
      </aside>
    </>
  );
}