import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  User,
  KeyRound,
  CalendarCheck,
} from "lucide-react";

// Hierarquia de cargos — cima = maior nível, baixo = menor nível
const ROLE_HIERARCHY = [
  "admin",
  "diretor",
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

const ROLE_LABELS: Record<string, string> = {
  admin: "Administradores",
  diretor: "Diretores",
  gerente: "Gerentes",
  supervisor: "Supervisores",
  coordenador: "Coordenadores",
  analista: "Analistas",
  assistente: "Assistentes",
  outros: "Outros",
};

function groupUsersByRole<T extends { nome?: string; role?: string }>(
  list: T[]
): { roleKey: string; label: string; items: T[] }[] {
  const sorted = sortUsersByHierarchy(list);
  const map = new Map<string, T[]>();

  for (const u of sorted) {
    const raw = String(u.role || "").toLowerCase().trim();
    const key = ROLE_HIERARCHY.includes(raw) ? raw : "outros";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(u);
  }

  const out: { roleKey: string; label: string; items: T[] }[] = [];
  for (const role of ROLE_HIERARCHY) {
    const items = map.get(role);
    if (items?.length)
      out.push({
        roleKey: role,
        label: ROLE_LABELS[role] || role,
        items,
      });
  }
  const outrosItems = map.get("outros");
  if (outrosItems?.length) {
    out.push({
      roleKey: "outros",
      label: ROLE_LABELS.outros,
      items: outrosItems,
    });
  }
  return out;
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const userGroups = useMemo(() => groupUsersByRole(users), [users]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      userGroups.forEach((g) => {
        if (next[g.roleKey] === undefined) next[g.roleKey] = false;
      });
      Object.keys(next).forEach((k) => {
        if (!userGroups.some((g) => g.roleKey === k)) delete next[k];
      });
      return next;
    });
  }, [userGroups]);

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
      role === "diretor" ||
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

  function collapsedItemClasses(isActive: boolean) {
    return collapsed
      ? `relative flex h-11 w-full shrink-0 items-center justify-center rounded-xl transition active:scale-[0.97] ${
          isActive
            ? "bg-primary/12 text-primary ring-1 ring-inset ring-primary/40 dark:bg-primary/25 dark:text-primary-foreground dark:ring-primary/55"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        }`
      : "";
  }

  function footerBtnClasses(kind: "default" | "amber" = "default") {
    const layout = collapsed
      ? "flex h-11 w-full shrink-0 items-center justify-center rounded-xl px-0"
      : "flex min-h-[44px] w-full shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm";
    if (kind === "amber") {
      return `${layout} border border-amber-300/80 text-amber-800 transition hover:bg-amber-100/80 hover:text-amber-950 active:scale-[0.98] dark:border-amber-500/30 dark:text-amber-400/90 dark:hover:bg-amber-500/10 dark:hover:text-amber-300`;
    }
    return `${layout} text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-foreground active:bg-sidebar-accent/80`;
  }

  function expandedItemClasses(isActive: boolean) {
    return !collapsed
      ? `flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm active:bg-sidebar-accent/80 ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        }`
      : "";
  }

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed z-50 touch-target rounded-xl border border-border bg-card text-foreground shadow-md backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95 dark:shadow-lg"
        style={{
          top: "max(0.5rem, env(safe-area-inset-top, 0px))",
          left: "max(0.5rem, env(safe-area-inset-left, 0px))",
        }}
      >
        <Menu size={22} className="text-foreground dark:text-white" />
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
          h-full max-h-[100dvh] min-h-0
          bg-sidebar
          border-r border-sidebar-border
          text-sidebar-foreground
          transition-all duration-300 ease-out
          flex flex-col
          z-50 md:z-auto
          shadow-2xl md:shadow-none
          ${
            isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        <div
          className={`flex shrink-0 items-center border-b border-sidebar-border p-3 md:p-4 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">Usuários</span>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden touch-target rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground md:flex md:items-center md:justify-center"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-1 text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
            aria-label="Fechar menu"
          >
            <X size={22} />
          </button>
        </div>

        <div
          className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden overscroll-y-contain p-2 pb-2 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:hsl(var(--sidebar-border))_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-border/80"
        >
          {/* DASHBOARD */}
            {(me?.role === "admin" ||
              ["diretor", "coordenador", "supervisor", "gerente"].includes(
                String(me?.role || "").toLowerCase().trim()
              )) && (
            <button
              type="button"
              onClick={() => {
                navigate("/dashboard");
                setIsMobileOpen(false);
              }}
              title={collapsed ? "Dashboard" : undefined}
              className={`shrink-0 ${
                collapsed
                  ? collapsedItemClasses(location.pathname === "/dashboard")
                  : expandedItemClasses(location.pathname === "/dashboard")
              }`}
            >
              <LayoutDashboard size={collapsed ? 20 : 18} strokeWidth={collapsed ? 2 : 1.75} />
              {!collapsed && "Dashboard"}
            </button>
          )}

          {/* USUÁRIOS — lista simples quando colapsado; agrupado quando expandido */}
          {collapsed
            ? sortUsersByHierarchy(users).map((u) => {
                const pending = pendingTotals[u.id] || 0;
                const isActive = location.pathname === `/user/${u.id}`;
                const pendingLabel = pending > 99 ? "99+" : String(pending);
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => {
                      navigate(`/user/${u.id}`);
                      setIsMobileOpen(false);
                    }}
                    title={u.nome}
                    className={collapsedItemClasses(isActive)}
                  >
                    <User size={collapsed ? 20 : 18} strokeWidth={collapsed ? 2 : 1.75} className="shrink-0" />
                    {pending > 0 ? (
                      <span
                        className={`absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-sidebar px-0.5 text-[9px] font-bold tabular-nums leading-none ${
                          isActive
                            ? "border-primary/50 bg-primary text-primary-foreground"
                            : "bg-muted text-foreground dark:border-zinc-800 dark:bg-zinc-600 dark:text-white"
                        }`}
                      >
                        {pendingLabel}
                      </span>
                    ) : null}
                  </button>
                );
              })
            : userGroups.map((group) => {
                const isOpen = openGroups[group.roleKey] === true;
                const groupPending = group.items.reduce(
                  (sum, u) => sum + (pendingTotals[u.id] || 0),
                  0
                );

                return (
                  <div
                    key={group.roleKey}
                    className="rounded-lg border border-sidebar-border/90 bg-sidebar-accent/35 dark:border-zinc-800/80 dark:bg-zinc-900/30"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroups((p) => ({
                          ...p,
                          [group.roleKey]: !isOpen,
                        }))
                      }
                      className="flex min-h-[40px] w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-sidebar-accent/80 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                    >
                      <span className="truncate pr-1">{group.label}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {groupPending > 0 && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground dark:bg-zinc-700 dark:text-zinc-200">
                            {groupPending}
                          </span>
                        )}
                        <ChevronDown
                          size={16}
                          className={`text-muted-foreground transition-transform dark:text-zinc-500 ${
                            isOpen ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-1 pb-1.5 space-y-0.5">
                        {group.items.map((u) => {
                          const pending = pendingTotals[u.id] || 0;
                          const isActive =
                            location.pathname === `/user/${u.id}`;

                          return (
                            <button
                              type="button"
                              key={u.id}
                              onClick={() => {
                                navigate(`/user/${u.id}`);
                                setIsMobileOpen(false);
                              }}
                              className={`flex min-h-[44px] w-full items-center justify-between rounded-lg px-2 py-2 text-sm active:bg-sidebar-accent/80 ${
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <User size={18} className="shrink-0" />
                                <div className="min-w-0 text-left">
                                  <div className="truncate">{u.nome}</div>
                                  <div
                                    className={`truncate text-xs capitalize ${
                                      isActive
                                        ? "text-primary-foreground/90 dark:text-red-100/80"
                                        : "text-muted-foreground dark:text-zinc-500"
                                    }`}
                                  >
                                    {u.role}
                                  </div>
                                </div>
                              </div>

                              {pending > 0 && (
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                                    isActive
                                      ? "bg-primary-foreground/20 text-primary-foreground dark:bg-red-500/90 dark:text-white"
                                      : "bg-muted text-muted-foreground dark:bg-zinc-700 dark:text-white"
                                  }`}
                                >
                                  {pending}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
        </div>

        {/* 🔥 FOOTER COM CONFIGURAÇÕES */}
        <div className="shrink-0 space-y-2 border-t border-sidebar-border bg-sidebar p-2 pb-safe md:pb-2">
          {me?.role === "admin" && (
            <>
              <button
                type="button"
                onClick={() => {
                  navigate("/admin/users");
                  setIsMobileOpen(false);
                }}
                title={collapsed ? "Gerenciar Usuários" : undefined}
                className={footerBtnClasses("default")}
              >
                <Settings size={collapsed ? 20 : 18} />
                {!collapsed && "Gerenciar Usuários"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(true);
                  setIsMobileOpen(false);
                }}
                title={
                  collapsed
                    ? "Datas de cadastro"
                    : "Ver datas de cadastro — monitorar pagamento a cada 30 dias"
                }
                className={footerBtnClasses("amber")}
              >
                <CalendarCheck size={collapsed ? 20 : 18} />
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
            title={collapsed ? "Alterar senha" : undefined}
            className={footerBtnClasses("default")}
          >
            <KeyRound size={collapsed ? 20 : 18} />
            {!collapsed && "Alterar senha"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMobileOpen(false);
              handleLogout();
            }}
            title={collapsed ? "Sair" : undefined}
            className={footerBtnClasses("default")}
          >
            <LogOut size={collapsed ? 20 : 18} />
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
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card text-card-foreground shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-label="Datas de cadastro para monitoramento de pagamento"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 dark:border-zinc-700">
          <h3 className="text-lg font-semibold text-foreground dark:text-white">
            Datas de cadastro
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <p className="shrink-0 px-4 pt-2 text-xs text-muted-foreground">
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
                className="flex flex-col gap-3 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
              >
                <div>
                  <div className="font-medium text-foreground dark:text-zinc-100">{u.nome}</div>
                  <div className="text-xs capitalize text-muted-foreground dark:text-zinc-500">{u.role}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Cadastro: <span className="text-foreground dark:text-zinc-200">{cadastro}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <div
                      className={`text-sm font-medium ${
                        vencido ? "text-red-600 dark:text-red-500" : "text-emerald-700 dark:text-emerald-400/90"
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