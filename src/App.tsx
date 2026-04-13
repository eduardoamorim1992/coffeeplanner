import { useEffect, useState, type ReactNode } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";

import { DesktopNotifyProvider } from "@/contexts/DesktopNotifyContext";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import DivisionPage from "@/pages/DivisionPage";
import Dashboard from "@/components/Dashboard";
import Login from "@/pages/Login";
import Cadastro from "@/pages/Cadastro";
import CadastroObrigado from "@/pages/CadastroObrigado";
import AguardandoAprovacao from "@/pages/AguardandoAprovacao";
import AdminUsers from "@/pages/AdminUsers";
import AlterarSenha from "@/pages/AlterarSenha";
import DefinirSenha from "@/pages/DefinirSenha";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/lib/supabase";

type Gate = "idle" | "loading" | "ok" | "pending" | "no_profile";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthUser();
  const [gate, setGate] = useState<Gate>("idle");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setGate("idle");
      return;
    }

    let cancelled = false;
    setGate("loading");

    (async () => {
      const { data: byId, error: errId } = await supabase
        .from("users")
        .select("aprovado, role")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      let row = byId;
      if ((errId || !row) && user.email) {
        const email = user.email.trim().toLowerCase();
        const { data: byEmail, error: errEmail } = await supabase
          .from("users")
          .select("aprovado, role")
          .eq("email", email)
          .maybeSingle();
        if (!cancelled && !errEmail && byEmail) {
          row = byEmail;
        }
      }

      if (!row) {
        setGate("no_profile");
        return;
      }

      const pendente =
        row.aprovado === false && row.role !== "admin";

      if (pendente) {
        setGate("pending");
        return;
      }

      setGate("ok");
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, authLoading]);

  if (authLoading || (user && gate === "loading")) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        Carregando sessão...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (gate === "pending") {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  if (gate === "no_profile") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <DesktopNotifyProvider>
        <Toaster
          richColors
          closeButton
          position="top-center"
          expand
          visibleToasts={4}
          toastOptions={{
            classNames: {
              toast:
                "min-h-[48px] text-base sm:text-sm touch-manipulation",
            },
          }}
        />
        <PwaInstallPrompt />
        <Routes>

        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/cadastro/obrigado" element={<CadastroObrigado />} />
        <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
        <Route path="/definir-senha" element={<DefinirSenha />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alterar-senha"
          element={
            <ProtectedRoute>
              <AlterarSenha />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/:userId"
          element={
            <ProtectedRoute>
              <DivisionPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </DesktopNotifyProvider>
    </BrowserRouter>
  );
}
