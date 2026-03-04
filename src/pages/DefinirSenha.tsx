import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function DefinirSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");

  async function salvar() {
    await supabase.auth.updateUser({
      password: senha,
    });

    navigate("/");
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

        <button
          onClick={salvar}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}