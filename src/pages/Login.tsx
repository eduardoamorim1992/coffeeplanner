import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    setMessage("");

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("LOGIN:", data, error);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (!data?.user) {
      alert("Erro ao logar");
      setLoading(false);
      return;
    }

    // 🔥 BUSCA USUÁRIO
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    console.log("USER:", userData);

    if (userError || !userData) {
      alert("Usuário não encontrado na tabela users");
      setLoading(false);
      return;
    }

    // 🔥 AGORA FUNCIONA NORMAL
    navigate(`/user/${userData.id}`);
  };

  const handleForgotPassword = async () => {
    setMessage("");

    if (!email.trim()) {
      setMessage("Informe seu email para recuperar a senha.");
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/definir-senha`,
    });

    if (error) {
      setMessage(error.message);
      setResetLoading(false);
      return;
    }

    setMessage("Enviamos o link de recuperacao para seu email.");
    setResetLoading(false);
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
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded text-sm"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={resetLoading}
          className="w-full text-sm text-zinc-300 hover:text-white underline underline-offset-2 disabled:opacity-60"
        >
          {resetLoading ? "Enviando..." : "Esqueci minha senha"}
        </button>

        {message ? (
          <div className="text-xs text-center text-zinc-300">
            {message}
          </div>
        ) : null}

      </div>
    </div>
  );
}