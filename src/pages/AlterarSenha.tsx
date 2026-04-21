import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ActionButton } from "@/components/ui/ActionButton";

export default function AlterarSenha() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function alterarSenha() {

    if (!password) {
      alert("Digite a nova senha");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const { data } = await supabase.auth.getUser();

    await supabase
      .from("users_profile")
      .update({
        first_login: false,
      })
      .eq("uid", data.user?.id);

    alert("Senha alterada com sucesso!");

    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">

      <div className="glass-card p-8 w-80 space-y-4">

        <h2 className="text-lg font-semibold text-center">
          Definir nova senha
        </h2>

        <input
          type="password"
          placeholder="Nova senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded bg-muted/30 border border-border text-sm"
        />

        <ActionButton
          onClick={alterarSenha}
          variant="primary"
          size="md"
          className="w-full"
        >
          Alterar senha
        </ActionButton>

      </div>
    </div>
  );
}