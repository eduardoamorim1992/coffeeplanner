import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LoginMouseBackground } from "@/components/LoginMouseBackground";
import { LoginBrandMark } from "@/components/LoginBrandMark";
import { MailCheck, AlertCircle, Eye, EyeOff } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SEC = 60;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "success" | "error">(
    "info"
  );
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      setMessage(state.message);
      setMessageKind("success");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SEC);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  const handleLogin = async () => {
    setMessage("");
    setMessageKind("info");

    if (!email.trim() || !password) {
      setMessageKind("error");
      setMessage("Informe email e senha.");
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setMessageKind("error");
      setMessage(
        error.message.includes("Invalid login")
          ? "Email ou senha incorretos."
          : error.message
      );
      setLoading(false);
      return;
    }

    if (!data?.user) {
      setMessageKind("error");
      setMessage("Não foi possível entrar. Tente novamente.");
      setLoading(false);
      return;
    }

    let userData: {
      id: string;
      aprovado?: boolean | null;
      role?: string | null;
    } | null = null;

    const byId = await supabase
      .from("users")
      .select("id, aprovado, role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (byId.data) {
      userData = byId.data;
    } else {
      const byEmail = await supabase
        .from("users")
        .select("id, aprovado, role")
        .eq("email", cleanEmail)
        .maybeSingle();
      userData = byEmail.data;
    }

    if (!userData) {
      setMessageKind("error");
      setMessage("Conta não encontrada. Entre em contato com o administrador.");
      setLoading(false);
      return;
    }

    const pendente =
      userData.aprovado === false && userData.role !== "admin";

    if (pendente) {
      await supabase.auth.signOut();
      setMessageKind("error");
      setMessage(
        "Sua conta ainda aguarda aprovação do administrador. Você receberá acesso quando for liberada."
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate(`/user/${userData.id}`);
  };

  const handleForgotPassword = async () => {
    setMessage("");
    const clean = email.trim().toLowerCase();

    if (!clean) {
      setMessageKind("error");
      setMessage("Digite seu email acima e clique novamente em Esqueci minha senha.");
      return;
    }

    if (!EMAIL_RE.test(clean)) {
      setMessageKind("error");
      setMessage("Digite um email válido.");
      return;
    }

    if (cooldown > 0) {
      return;
    }

    setResetLoading(true);
    setMessageKind("info");

    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/definir-senha`,
    });

    setResetLoading(false);

    if (error) {
      setMessageKind("error");
      setMessage(error.message);
      return;
    }

    setMessageKind("success");
    setMessage(
      "Se existir uma conta com esse email, enviamos um link para redefinir a senha. Confira a caixa de entrada e o spam. O link expira em poucas horas."
    );
    startCooldown();
  };

  return (
    <div className="dark relative min-h-screen flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4">
      <LoginMouseBackground />
      <LoginBrandMark />
      <div className="glass-card relative z-10 p-8 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold text-center text-foreground">
          Login
        </h2>

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
            autoComplete="current-password"
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
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={resetLoading || cooldown > 0}
          className="w-full text-sm text-zinc-400 hover:text-white underline underline-offset-2 disabled:opacity-50"
        >
          {resetLoading
            ? "Enviando..."
            : cooldown > 0
              ? `Aguarde ${cooldown}s para reenviar`
              : "Esqueci minha senha"}
        </button>

        <Link
          to="/cadastro"
          className="block w-full text-center text-sm text-zinc-400 hover:text-white underline underline-offset-2"
        >
          Cadastrar novo usuário
        </Link>

        {message ? (
          <div
            role="status"
            className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed flex gap-2 ${
              messageKind === "success"
                ? "bg-emerald-950/50 border border-emerald-800/60 text-emerald-200"
                : messageKind === "error"
                  ? "bg-red-950/40 border border-red-900/60 text-red-200"
                  : "bg-muted/50 border border-border text-zinc-300"
            }`}
          >
            {messageKind === "success" ? (
              <MailCheck className="shrink-0 w-4 h-4 mt-0.5 text-emerald-400" />
            ) : messageKind === "error" ? (
              <AlertCircle className="shrink-0 w-4 h-4 mt-0.5 text-red-400" />
            ) : null}
            <span>{message}</span>
          </div>
        ) : null}

        <p className="text-[10px] text-center text-zinc-500 leading-snug">
          Na recuperação, use o mesmo email cadastrado. Se não receber em alguns
          minutos, verifique o spam.
        </p>
      </div>
    </div>
  );
}
