import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      console.log("AUTH DATA:", data);
      console.log("AUTH ERROR:", error);

      if (error) {
        alert(error.message);
        return;
      }

      if (!data?.user) {
        alert("Usuário não encontrado.");
        return;
      }

      // 🔎 Buscar perfil do usuário
      const { data: profile, error: profileError } =
        await supabase
          .from("users_profile")
          .select("*")
          .eq("id", data.user.id)
          .single();

      console.log("PROFILE:", profile);
      console.log("PROFILE ERROR:", profileError);

      if (profileError) {
        alert("Perfil não encontrado no sistema.");
        return;
      }

      if (!profile?.ativo) {
        alert("Usuário bloqueado.");
        return;
      }

      // 🔐 Salva perfil no localStorage
      localStorage.setItem(
        "user_profile",
        JSON.stringify(profile)
      );

      // 🚀 Redirecionamento por role
      if (
        profile.role === "admin" ||
        profile.role === "gerente"
      ) {
        navigate("/dashboard");
      } else {
        navigate(`/${profile.division_id}`);
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Erro inesperado ao logar.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass-card p-8 w-80 space-y-4">
        <h2 className="text-lg font-semibold text-center">
          Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          className="w-full px-3 py-2 rounded bg-muted/30 border border-border text-sm"
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          className="w-full px-3 py-2 rounded bg-muted/30 border border-border text-sm"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-primary text-white py-2 rounded text-sm hover:opacity-90"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}