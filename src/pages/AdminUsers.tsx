import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const ROLES = [
  "assistente",
  "analista",
  "coordenador",
  "supervisor",
  "gerente",
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

      const { error: profileError } = await supabase.from("users").upsert(
        {
          id: signUpData.user.id,
          nome: cleanNome,
          email: cleanEmail,
          role,
        },
        { onConflict: "id" }
      );

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

  return (
    <div className="p-6 text-white">
      <button onClick={() => navigate("/dashboard")}>
        ← Voltar
      </button>

      <h1 className="text-xl mb-6">⚙ Gerenciar Usuários</h1>

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

      {/* LISTA */}
      <div className="space-y-3">
        {users.map((u) => {
          const managersIds = getManagers(u.id);

          return (
            <div
              key={u.id}
              className="border border-zinc-700 p-4 rounded flex justify-between"
            >
              {/* INFO */}
              <div>
                <div className="font-medium">{u.nome}</div>
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