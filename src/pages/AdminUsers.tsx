import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const ROLES = [
  "assistente",
  "analista",
  "coordenador",
  "supervisor",
  "gerente",
  "diretor",
  "admin",
];

export default function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("assistente");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  /** Filtro da lista (não confundir com email do formulário de novo usuário) */
  const [listSearch, setListSearch] = useState("");

  // 🔥 LOAD
  async function loadData() {
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .order("nome");

    const { data: relData } = await supabase
      .from("user_managers")
      .select("*");

    setUsers(usersData || []);
    setRelations(relData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  function validateForm() {
    if (!nome.trim()) {
      return "Informe o nome";
    }

    if (!email.trim()) {
      return "Informe o email";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      return "Informe um email valido";
    }

    if (!password.trim()) {
      return "Informe a senha";
    }

    if (password.length < 6) {
      return "A senha deve ter pelo menos 6 caracteres";
    }

    return "";
  }

  // 🔥 CRIAR USUÁRIO
  async function handleCreateUser() {
    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);

    try {
      const cleanNome = nome.trim();
      const cleanEmail = email.trim().toLowerCase();
      const { data: currentSessionData } = await supabase.auth.getSession();
      const currentSession = currentSessionData.session;

      const { data: duplicatedUser, error: duplicatedUserError } = await supabase
        .from("users")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (duplicatedUserError) {
        setErrorMessage("Erro ao validar duplicidade de email");
        return;
      }

      if (duplicatedUser) {
        setErrorMessage("Ja existe um usuario com este email");
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            nome: cleanNome,
            role,
          },
        },
      });

      if (signUpError || !signUpData.user) {
        if (signUpError?.message?.toLowerCase().includes("already registered")) {
          setErrorMessage("Ja existe cadastro no Auth para este email");
          return;
        }

        setErrorMessage(signUpError?.message || "Erro ao criar usuario no auth");
        return;
      }

      // Se o signUp trocar a sessão para o novo usuário, restauramos a sessão atual.
      if (
        currentSession?.access_token &&
        currentSession?.refresh_token &&
        signUpData.session?.user?.id &&
        signUpData.session.user.id !== currentSession.user.id
      ) {
        const { error: restoreSessionError } = await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });

        if (restoreSessionError) {
          setErrorMessage("Usuario criado no Auth, mas falhou ao restaurar sessao do admin");
          return;
        }
      }

      const uid = signUpData.user.id;
      const adminRow: Record<string, unknown> = {
        id: uid,
        auth_id: uid,
        nome: cleanNome,
        email: cleanEmail,
        role,
        aprovado: true,
        created_at: new Date().toISOString(),
      };

      let { error: profileError } = await supabase
        .from("users")
        .upsert(adminRow, { onConflict: "id" });

      if (profileError) {
        const fallback = { ...adminRow };
        delete fallback.auth_id;
        const r2 = await supabase
          .from("users")
          .upsert(fallback, { onConflict: "id" });
        profileError = r2.error;
      }

      if (profileError) {
        setErrorMessage(profileError.message || "Erro ao salvar dados do usuario");
        return;
      }

      setSuccessMessage("Usuario criado com sucesso");

      setNome("");
      setEmail("");
      setPassword("");
      setRole("assistente");
      loadData();
    } catch (err) {
      console.error(err);
      setErrorMessage("Erro na requisicao");
    } finally {
      setLoading(false);
    }
  }

  async function approveUser(id: string) {
    setErrorMessage("");
    setSuccessMessage("");
    const { error } = await supabase
      .from("users")
      .update({ aprovado: true })
      .eq("id", id);
    if (error) {
      setErrorMessage(error.message || "Erro ao aprovar");
      return;
    }
    setSuccessMessage("Usuário aprovado.");
    loadData();
  }

  // 🔥 ALTERAR ROLE
  async function updateRole(id: string, newRole: string) {
    await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", id);

    loadData();
  }

  // 🔥 ADICIONAR GESTOR
  async function addManager(userId: string, managerId: string) {
    if (!managerId) return;

    await supabase.from("user_managers").insert({
      user_id: userId,
      manager_id: managerId,
    });

    loadData();
  }

  // 🔥 REMOVER GESTOR
  async function removeManager(userId: string, managerId: string) {
    await supabase
      .from("user_managers")
      .delete()
      .eq("user_id", userId)
      .eq("manager_id", managerId);

    loadData();
  }

  // 🔥 PEGAR GESTORES
  function getManagers(userId: string) {
    return relations
      .filter((r) => r.user_id === userId)
      .map((r) => r.manager_id);
  }

  const filteredUsers = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const nomeStr = String(u.nome ?? "").toLowerCase();
      const emailStr = String(u.email ?? "").toLowerCase();
      return nomeStr.includes(q) || emailStr.includes(q);
    });
  }, [users, listSearch]);

  const pendentesAprovacao = useMemo(
    () => users.filter((u) => u.aprovado === false),
    [users]
  );

  return (
    <div className="p-6 text-white">
      <button onClick={() => navigate("/dashboard")}>
        ← Voltar
      </button>

      <h1 className="text-xl mb-6">⚙ Gerenciar Usuários</h1>

      {pendentesAprovacao.length > 0 ? (
        <div className="mb-8 rounded-xl border-2 border-amber-600/50 bg-amber-950/25 p-4">
          <h2 className="text-lg font-semibold text-amber-200 mb-1">
            Aprovar cadastros
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Estes usuários pediram acesso pelo formulário de cadastro. Aprove
            para liberar o login.
          </p>
          <ul className="space-y-2">
            {pendentesAprovacao.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-600 bg-zinc-900/80 px-3 py-2"
              >
                <div>
                  <div className="font-medium text-white">{u.nome}</div>
                  <div className="text-xs text-zinc-400">{u.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => approveUser(u.id)}
                  className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Aprovar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* FORM */}
      <div className="flex gap-2 mb-6">
        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="px-3 py-2 rounded bg-zinc-800 w-56"
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 rounded bg-zinc-800 w-64"
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 rounded bg-zinc-800 w-52"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 rounded bg-zinc-800"
        >
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <button
          onClick={handleCreateUser}
          disabled={loading}
          className="bg-red-600 px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Criando..." : "Cadastrar"}
        </button>
      </div>

      {errorMessage ? (
        <div className="mb-4 rounded border border-red-700 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-4 rounded border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      <div className="mb-4 max-w-xl">
        <label htmlFor="admin-users-search" className="mb-1 block text-sm text-zinc-400">
          Buscar na lista
        </label>
        <input
          id="admin-users-search"
          type="search"
          placeholder="Nome ou e-mail…"
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          autoComplete="off"
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {listSearch.trim() ? (
          <p className="mt-1.5 text-xs text-zinc-500">
            {filteredUsers.length === 0
              ? "Nenhum usuário encontrado."
              : `Exibindo ${filteredUsers.length} de ${users.length} usuário${users.length === 1 ? "" : "s"}.`}
          </p>
        ) : null}
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {filteredUsers.map((u) => {
          const managersIds = getManagers(u.id);

          return (
            <div
              key={u.id}
              className="border border-zinc-700 p-4 rounded flex justify-between"
            >
              {/* INFO */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{u.nome}</span>
                  {u.aprovado === false ? (
                    <span className="rounded bg-amber-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
                      Pendente
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-zinc-400">
                  {u.email}
                </div>
              </div>

              {/* AÇÕES */}
              <div className="flex flex-col items-end gap-2">

                {/* ROLE */}
                <select
                  value={u.role}
                  onChange={(e) =>
                    updateRole(u.id, e.target.value)
                  }
                  className="bg-zinc-800 px-2 py-1 rounded"
                >
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>

                {/* GESTORES */}
                <div className="flex flex-wrap gap-1 justify-end">
                  {managersIds.map((mId: string) => {
                    const manager = users.find(
                      (x) => x.id === mId
                    );

                    return (
                      <div
                        key={mId}
                        className="bg-zinc-700 px-2 py-1 rounded flex items-center gap-2"
                      >
                        {manager?.nome || "?"}

                        <button
                          onClick={() =>
                            removeManager(u.id, mId)
                          }
                          className="text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* ADICIONAR GESTOR */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addManager(u.id, e.target.value);
                    }
                  }}
                  className="bg-zinc-800 px-2 py-1 rounded"
                >
                  <option value="">+ Adicionar gestor</option>

                  {users
                    .filter(
                      (x) =>
                        x.role === "diretor" ||
                        x.role === "coordenador" ||
                        x.role === "supervisor" ||
                        x.role === "gerente"
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                </select>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}