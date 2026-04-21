import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LoginMouseBackground } from "@/components/LoginMouseBackground";
import {
  SIGNUP_ROLE_OPTIONS,
  isValidSignupRole,
  type SignupRole,
} from "@/constants/userRoles";
import { ActionButton } from "@/components/ui/ActionButton";
import { cn } from "@/lib/utils";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Cadastro() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [categoria, setCategoria] = useState<SignupRole>("assistente");
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
    if (!isValidSignupRole(categoria)) {
      setMessage("Escolha uma categoria válida.");
      return;
    }

    setLoading(true);

    const cleanNome = nome.trim();
    const cleanEmail = email.trim().toLowerCase();

    const { data: dup } = await supabase
      .from("users")
      .select("id")
      .ilike("email", cleanEmail)
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
        data: { nome: cleanNome, role: categoria },
      },
    });

    if (signUpError || !signUpData.user) {
      const msg = signUpError?.message ?? "Não foi possível criar a conta.";
      if (msg.toLowerCase().includes("already registered")) {
        // Conta já existe no Auth (mesmo que não apareça em public.users): enviar recuperação ajuda a retomar acesso.
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: `${window.location.origin}/definir-senha`,
          }
        );
        if (resetError) {
          setMessage(
            "Este email já existe no login. Use \"Esqueci minha senha\" na tela de login para recuperar o acesso."
          );
        } else {
          setMessage(
            "Encontramos cadastro anterior deste email no login. Enviamos um link para redefinir a senha e continuar o acesso."
          );
        }
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
      role: categoria,
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

        <div className="space-y-2">
          <p className="text-xs text-zinc-400">Sua categoria / função</p>
          <div className="grid grid-cols-2 gap-2">
            {SIGNUP_ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategoria(opt.value)}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                  categoria === opt.value
                    ? "border-primary bg-primary/25 text-white shadow-sm ring-1 ring-primary/40"
                    : "border-border bg-muted/20 text-zinc-300 hover:border-zinc-500 hover:bg-muted/35"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

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

        <ActionButton
          onClick={handleCadastrar}
          disabled={loading}
          variant="primary"
          size="md"
          className="w-full"
        >
          {loading ? "Enviando..." : "Cadastrar"}
        </ActionButton>

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
