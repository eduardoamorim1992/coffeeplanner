import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { LoginMouseBackground } from "@/components/LoginMouseBackground";

/**
 * Processa o retorno do email de recuperação (PKCE, magic link com hash ou token_hash na query).
 * Sem sessão válida, updateUser({ password }) falha.
 */
async function establishRecoverySession(): Promise<{
  ok: boolean;
  errorMessage?: string;
}> {
  const cleanUrlToPath = (path: string) => {
    window.history.replaceState({}, document.title, path);
  };

  try {
    const url = new URL(window.location.href);
    const search = url.searchParams;
    const code = search.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );
      if (error) {
        return { ok: false, errorMessage: error.message };
      }
      cleanUrlToPath("/definir-senha");
      return { ok: true };
    }

    const token_hash = search.get("token_hash");
    const type = search.get("type") as EmailOtpType | null;
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });
      if (error) {
        return { ok: false, errorMessage: error.message };
      }
      cleanUrlToPath("/definir-senha");
      return { ok: true };
    }

    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const h = new URLSearchParams(hash);
      const access_token = h.get("access_token");
      const refresh_token = h.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          return { ok: false, errorMessage: error.message };
        }
        cleanUrlToPath("/definir-senha");
        return { ok: true };
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      return { ok: true };
    }

    return {
      ok: false,
      errorMessage:
        "Link inválido ou expirado. Volte ao login e clique em \"Esqueci minha senha\" novamente.",
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao processar o link.";
    return { ok: false, errorMessage: msg };
  }
}

export default function DefinirSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [message, setMessage] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const initSession = useCallback(async () => {
    setMessage("");
    const result = await establishRecoverySession();
    if (!result.ok) {
      setMessage(result.errorMessage || "Não foi possível validar o link.");
      setSessionReady(false);
      return;
    }
    setSessionReady(true);
  }, []);

  useEffect(() => {
    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION"
      ) {
        if (session) {
          setSessionReady(true);
          setMessage("");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [initSession]);

  async function salvar() {
    setMessage("");

    if (!senha.trim()) {
      setMessage("Digite a nova senha.");
      return;
    }

    if (senha.length < 6) {
      setMessage("Use pelo menos 6 caracteres (recomendado: letras e números).");
      return;
    }

    if (senha !== confirmacao) {
      setMessage("As duas senhas precisam ser iguais.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Sessão expirada. Solicite um novo email em Esqueci minha senha.");
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

    await supabase.auth.signOut();
    setLoading(false);
    navigate("/login", {
      replace: true,
      state: { message: "Senha atualizada. Faça login com a nova senha." },
    });
  }

  if (!sessionReady && !message) {
    return (
      <div className="dark relative flex min-h-screen min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4">
        <LoginMouseBackground />
        <p className="relative z-10 text-sm text-zinc-400">Validando link...</p>
      </div>
    );
  }

  return (
    <div className="dark relative flex min-h-screen min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4">
      <LoginMouseBackground />
      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg">
        <h1 className="text-lg font-semibold text-foreground">
          Definir nova senha
        </h1>

        {message ? (
          <div className="text-sm rounded-lg px-3 py-2 flex gap-2 bg-red-950/40 border border-red-900/50 text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        ) : null}

        {message && !sessionReady ? (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full rounded-lg border border-border py-2 text-sm hover:bg-muted"
          >
            Voltar ao login
          </button>
        ) : null}

        {sessionReady ? (
          <>
            <p className="text-xs text-muted-foreground">
              Escolha uma senha forte (mínimo 6 caracteres). Você será deslogado
              deste link após salvar.
            </p>

            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Nova senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <input
                type={showPwd2 ? "text" : "password"}
                placeholder="Confirmar nova senha"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd2((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                aria-label={showPwd2 ? "Ocultar confirmação" : "Mostrar confirmação"}
              >
                {showPwd2 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="button"
              onClick={salvar}
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
