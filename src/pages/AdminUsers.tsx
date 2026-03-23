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
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("assistente");

  // 🔥 CARREGAR DADOS
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

  // 🔥 CRIAR USUÁRIO
  async function handleCreateUser() {
    if (!email) return alert("Informe email");

    const { data, error } = await supabase.auth.signUp({
      email,
      password: "123456",
    });

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("users").insert({
      auth_id: data.user?.id,
      email,
      nome: email.split("@")[0],
      role,
      ativo: true,
    });

    setEmail("");
    loadData();
  }

  // 🔥 ATUALIZAR ROLE
  async function updateRole(id: string, newRole: string) {
    await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", id);

    loadData();
  }

  // 🔥 ADICIONAR GESTOR
  async function addManager(userId: string, managerId: string) {
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

  // 🔥 PEGAR GESTORES DO USUÁRIO
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

      <h1 className="text-xl mb-4">⚙ Gerenciar Usuários</h1>

      {/* FORM */}
      <div className="flex gap-2 mb-6">
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 rounded bg-zinc-800"
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
          className="bg-red-600 px-4 py-2 rounded"
        >
          Cadastrar
        </button>
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {users.map((u) => {
          const managersIds = getManagers(u.id);

          return (
            <div
              key={u.id}
              className="border border-zinc-700 p-3 rounded flex justify-between"
            >
              <div>
                <div>{u.nome}</div>
                <div className="text-xs text-zinc-400">{u.email}</div>
              </div>

              <div className="flex flex-col gap-2 items-end">

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