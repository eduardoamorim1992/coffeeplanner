import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Clock } from "lucide-react";

export default function AguardandoAprovacao() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;
      const u = session.user;
      let { data } = await supabase
        .from("users")
        .select("aprovado, role")
        .eq("id", u.id)
        .maybeSingle();
      if (!data && u.email) {
        const r = await supabase
          .from("users")
          .select("aprovado, role")
          .eq("email", u.email.trim().toLowerCase())
          .maybeSingle();
        data = r.data;
      }
      if (cancelled || !data) return;
      const ok =
        data.role === "admin" ||
        data.aprovado !== false;
      if (ok) {
        navigate("/dashboard", { replace: true });
      }
    };

    void tick();
    const t = setInterval(() => void tick(), 12000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [navigate]);

  const sair = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-card p-8 w-full max-w-sm space-y-4 text-center">
        <Clock className="w-12 h-12 mx-auto text-amber-400" />
        <h2 className="text-lg font-semibold text-foreground">
          Aguardando aprovação
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Sua conta ainda não foi liberada pelo administrador. Esta página
          atualiza sozinha; você também pode tentar o login de novo depois.
        </p>
        <button
          type="button"
          onClick={sair}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
