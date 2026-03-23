import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function DefinirSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function salvar() {
    setMessage("");

    if (!senha.trim()) {
      setMessage("Digite a nova senha.");
      return;
    }

    if (senha.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmacao) {
      setMessage("As senhas nao coincidem.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: senha,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage("Senha atualizada com sucesso. Voce ja pode entrar.");
    navigate("/login");
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="space-y-4">
        <h1 className="text-lg font-bold">
          Definir senha
        </h1>

        <input
          type="password"
          placeholder="Nova senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="border px-3 py-2 rounded"
        />

        <input
          type="password"
          placeholder="Confirmar nova senha"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          className="border px-3 py-2 rounded"
        />

        <button
          onClick={salvar}
          disabled={loading}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>

        {message ? <div className="text-sm">{message}</div> : null}
      </div>
    </div>
  );
}