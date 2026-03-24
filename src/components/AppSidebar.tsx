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
  CalendarCheck,
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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

    // 🔥 ADMIN → TODOS (inclui created_at e ultimo_pagamento para monitorar pagamentos)
    if (role === "admin") {
      const { data } = await supabase
        .from("users")
        .select("id, nome, role, created_at, ultimo_pagamento")
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
            <>
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
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(true);
                  setIsMobileOpen(false);
                }}
                title="Ver datas de cadastro — monitorar pagamento a cada 30 dias"
                className="flex items-center gap-3 w-full min-h-[44px] px-3 py-2.5 rounded-lg text-sm text-amber-400/90 hover:bg-amber-500/10 hover:text-amber-300 border border-amber-500/30"
              >
                <CalendarCheck size={18} />
                {!collapsed && "Datas de cadastro"}
              </button>
            </>
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

      {/* Modal Datas de cadastro — apenas admin */}
      {showPaymentModal && me?.role === "admin" && (
        <PaymentDatesModal
          users={users}
          onClose={() => setShowPaymentModal(false)}
          onMarkPaid={loadUsers}
        />
      )}
    </>
  );
}

function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function addDays(dateStr: string | null | undefined, days: number): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getProximoVencimento(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + 30);
    return d;
  } catch {
    return null;
  }
}

function isVencido(dateStr: string | null | undefined): boolean {
  const prox = getProximoVencimento(dateStr);
  if (!prox) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  prox.setHours(0, 0, 0, 0);
  return prox < hoje;
}

function PaymentDatesModal({
  users,
  onClose,
  onMarkPaid,
}: {
  users: any[];
  onClose: () => void;
  onMarkPaid: () => void;
}) {
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function handleMarkPaid(userId: string) {
    setMarkingId(userId);
    try {
      const { error } = await supabase
        .from("users")
        .update({ ultimo_pagamento: new Date().toISOString() })
        .eq("id", userId);

      if (!error) onMarkPaid();
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        role="dialog"
        aria-label="Datas de cadastro para monitoramento de pagamento"
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">
            Datas de cadastro
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <p className="px-4 pt-2 text-xs text-zinc-500 shrink-0">
          Ciclo de pagamento a cada 30 dias
        </p>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {sortUsersByHierarchy(users).map((u) => {
            const baseDate = u.ultimo_pagamento || u.created_at;
            const cadastro = formatDateBR(u.created_at);
            const proximoStr = addDays(baseDate, 30);
            const vencido = isVencido(baseDate);

            return (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-zinc-800 last:border-0"
              >
                <div>
                  <div className="font-medium text-zinc-100">{u.nome}</div>
                  <div className="text-xs text-zinc-500 capitalize">{u.role}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Cadastro: <span className="text-zinc-200">{cadastro}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-sm font-medium ${
                        vencido ? "text-red-500" : "text-emerald-400/90"
                      }`}
                    >
                      {vencido ? "Vencido" : `Próximo: ${proximoStr}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(u.id)}
                    disabled={markingId === u.id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {markingId === u.id ? "..." : "PAGO"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}