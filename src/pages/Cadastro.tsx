import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LoginMouseBackground } from "@/components/LoginMouseBackground";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Cadastro() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCadastrar = async () => {
    setMessage("");

    if (!nome.trim()) {
      setMessage("Informe seu nome.");
      return;
    }
    if (!email.trim()) {
      setMessage("Informe seu email.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setMessage("Digite um email válido.");
      return;
    }
    if (!password) {
      setMessage("Informe uma senha.");
      return;
    }
    if (password.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const cleanNome = nome.trim();
    const cleanEmail = email.trim().toLowerCase();

    const { data: dup } = await supabase
      .from("users")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (dup) {
      setMessage("Já existe uma conta com este email.");
      setLoading(false);
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { nome: cleanNome },
      },
    });

    if (signUpError || !signUpData.user) {
      const msg = signUpError?.message ?? "Não foi possível criar a conta.";
      if (msg.toLowerCase().includes("already registered")) {
        setMessage("Este email já está cadastrado. Tente fazer login.");
      } else {
        setMessage(msg);
      }
      setLoading(false);
      return;
    }

    const uid = signUpData.user.id;
    const row: Record<string, unknown> = {
      id: uid,
      nome: cleanNome,
      email: cleanEmail,
      role: "assistente",
      aprovado: false,
      created_at: new Date().toISOString(),
      auth_id: uid,
    };

    const { error: profileError } = await supabase
      .from("users")
      .upsert(row, { onConflict: "id" });

    if (profileError) {
      const tryNoAuthId = { ...row };
      delete tryNoAuthId.auth_id;
      const { error: e2 } = await supabase.from("users").upsert(tryNoAuthId, {
        onConflict: "id",
      });
      if (e2) {
        setMessage(
          profileError.message ||
            "Conta criada no login, mas falhou ao salvar o perfil. Peça ao administrador."
        );
        setLoading(false);
        return;
      }
    }

    await supabase.auth.signOut();
    navigate("/cadastro/obrigado", { replace: true });
  };

  return (
    <div className="dark relative min-h-screen flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4">
      <LoginMouseBackground />
      <div className="glass-card relative z-10 p-8 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold text-center text-foreground">
          Cadastrar
        </h2>

        <input
          type="text"
          placeholder="Nome do usuário"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm"
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full px-3 py-2 pr-10 rounded-lg bg-muted/30 border border-border text-sm"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="button"
          onClick={handleCadastrar}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Cadastrar"}
        </button>

        <Link
          to="/login"
          className="block w-full text-center text-sm text-zinc-400 hover:text-white underline underline-offset-2"
        >
          Já tenho conta — entrar
        </Link>

        {message ? (
          <div
            role="alert"
            className="rounded-lg px-3 py-2.5 text-xs leading-relaxed flex gap-2 bg-red-950/40 border border-red-900/60 text-red-200"
          >
            <AlertCircle className="shrink-0 w-4 h-4 mt-0.5 text-red-400" />
            <span>{message}</span>
          </div>
        ) : null}

        <p className="text-[10px] text-center text-zinc-500 leading-snug">
          Depois do cadastro, um administrador precisa aprovar sua conta antes
          você acessar o sistema.
        </p>
      </div>
    </div>
  );
}
