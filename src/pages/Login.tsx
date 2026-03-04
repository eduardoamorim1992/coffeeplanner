import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    if (!data?.user) {
      alert("Usuário não encontrado");
      return;
    }

    // 🔎 BUSCAR PERFIL PELO EMAIL
    const { data: profile, error: profileError } =
      await supabase
        .from("users_profile")
        .select("*")
        .eq("email", email)
        .single();

    if (profileError || !profile) {
      alert("Perfil não encontrado no sistema");
      return;
    }

    // 🔗 SE UID AINDA NÃO EXISTIR → SALVAR
    if (!profile.uid) {

      await supabase
        .from("users_profile")
        .update({
          uid: data.user.id
        })
        .eq("email", email);

      profile.uid = data.user.id;
    }

    if (!profile.ativo) {
      alert("Usuário bloqueado");
      return;
    }

    localStorage.setItem(
      "user_profile",
      JSON.stringify(profile)
    );

    if (profile.first_login) {
      navigate("/alterar-senha");
      return;
    }

    if (profile.role === "admin") {
      navigate("/dashboard");
    } else {
      navigate(`/${profile.division_id}`);
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
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded bg-muted/30 border border-border text-sm"
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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