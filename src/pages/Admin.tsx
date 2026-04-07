import { useState } from "react";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [role, setRole] = useState("engenheiro");
  const [divisionId, setDivisionId] = useState("");

  async function handleCreate() {
    const res = await fetch("/api/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        nome,
        role,
        division_id: divisionId,
      }),
    });

    const data = await res.json();

    if (data.error) {
      alert("Erro ao criar usuário");
    } else {
      alert("Usuário criado com sucesso");
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Painel Administrativo</h2>

      <input placeholder="Nome" onChange={(e) => setNome(e.target.value)} />
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input
        placeholder="Senha"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        placeholder="Divisão"
        onChange={(e) => setDivisionId(e.target.value)}
      />

      <select onChange={(e) => setRole(e.target.value)}>
        <option value="engenheiro">Engenheiro</option>
        <option value="supervisor">Supervisor</option>
        <option value="gerente">Gerente</option>
        <option value="diretor">Diretor</option>
        <option value="coordenador">Coordenador</option>
      </select>

      <button onClick={handleCreate}>Criar Usuário</button>
    </div>
  );
}