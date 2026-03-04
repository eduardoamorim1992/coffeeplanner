import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface UserProfile {
  uid?: string;
  email: string;
  division_id: string;
  role: string;
  ativo: boolean;
}

export default function AdminUsers() {

  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [email, setEmail] = useState("");
  const [division, setDivision] = useState("central");
  const [role, setRole] = useState("usuario");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {

    const { data } = await supabase
      .from("users_profile")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(data || []);
  }

  async function createUser() {

    if (!email) {
      alert("Digite o email");
      return;
    }

    setLoading(true);

    // verifica se já existe
    const { data: existing } = await supabase
      .from("users_profile")
      .select("email")
      .eq("email", email)
      .single();

    if (existing) {
      alert("Usuário já existe");
      setLoading(false);
      return;
    }

    // cria no AUTH
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: "123456",
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      alert("Erro ao criar usuário");
      setLoading(false);
      return;
    }

    // grava no users_profile
    const { error: insertError } = await supabase
      .from("users_profile")
      .insert({
        uid: data.user.id,
        email: email,
        role: role,
        division_id: division,
        ativo: true,
        first_login: true
      });

    if (insertError) {
      alert(insertError.message);
      setLoading(false);
      return;
    }

    alert("Usuário criado! Senha inicial: 123456");

    setEmail("");
    setLoading(false);

    loadUsers();
  }

  async function updateUser(user: UserProfile, field: string, value: any) {

    await supabase
      .from("users_profile")
      .update({ [field]: value })
      .eq("email", user.email);

    loadUsers();
  }

  async function deleteUser(user: UserProfile) {

    if (!confirm("Deseja excluir o usuário?")) return;

    await supabase
      .from("users_profile")
      .delete()
      .eq("email", user.email);

    loadUsers();
  }

  return (
    <div className="p-8 space-y-8">

      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <h1 className="text-2xl font-bold flex items-center gap-2">
        ⚙️ Gerenciar Usuários
      </h1>

      <div className="flex flex-wrap gap-4 items-end border p-4 rounded-lg bg-muted/10">

        <input
          type="email"
          placeholder="Email do usuário"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border px-3 py-2 rounded text-black bg-white"
        />

        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          className="border px-3 py-2 rounded text-black bg-white"
        >
          <option value="central">Central</option>
          <option value="planejamento">Planejamento</option>
          <option value="laboratorio-oleo">Laboratório</option>
          <option value="gestao-pneus">Gestão Pneus</option>
        </select>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border px-3 py-2 rounded text-black bg-white"
        >
          <option value="usuario">Usuário</option>
          <option value="admin">Admin</option>
        </select>

        <button
          onClick={createUser}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
        >
          {loading ? "Criando..." : "Cadastrar"}
        </button>

      </div>

      <div className="space-y-3">

        {users.map((u) => (

          <div
            key={u.email}
            className="flex flex-wrap md:flex-nowrap justify-between items-center gap-4 border p-4 rounded-lg bg-zinc-900"
          >

            <div className="flex-1 min-w-[200px] text-white">
              {u.email}
            </div>

            <select
              value={u.role}
              onChange={(e) =>
                updateUser(u, "role", e.target.value)
              }
              className="border px-2 py-1 rounded text-black bg-white text-sm"
            >
              <option value="usuario">Usuário</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={u.division_id}
              onChange={(e) =>
                updateUser(u, "division_id", e.target.value)
              }
              className="border px-2 py-1 rounded text-black bg-white text-sm"
            >
              <option value="central">Central</option>
              <option value="planejamento">Planejamento</option>
              <option value="laboratorio-oleo">Laboratório</option>
              <option value="gestao-pneus">Gestão Pneus</option>
            </select>

            <button
              onClick={() =>
                updateUser(u, "ativo", !u.ativo)
              }
              className={`px-3 py-1 rounded text-white ${
                u.ativo ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {u.ativo ? "Ativo" : "Inativo"}
            </button>

            <button
              onClick={() => deleteUser(u)}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
            >
              Excluir
            </button>

          </div>

        ))}

      </div>

    </div>
  );
}