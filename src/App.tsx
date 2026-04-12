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
import AdminUsers from "@/pages/AdminUsers";
import AlterarSenha from "@/pages/AlterarSenha";
import DefinirSenha from "@/pages/DefinirSenha";
import { useAuthUser } from "@/hooks/useAuthUser";

// 🔥 PROTECTED ROUTE BASE (ÚNICO CONTROLE)
function ProtectedRoute({ children }: any) {
  const { user, loading } = useAuthUser();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        Carregando sessão...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
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

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />
        <Route path="/definir-senha" element={<DefinirSenha />} />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          }
        />

        {/* ALTERAR SENHA */}
        <Route
          path="/alterar-senha"
          element={
            <ProtectedRoute>
              <AlterarSenha />
            </ProtectedRoute>
          }
        />

        {/* 🔥 USER PAGE */}
        <Route
          path="/user/:userId"
          element={
            <ProtectedRoute>
              <DivisionPage />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </DesktopNotifyProvider>
    </BrowserRouter>
  );
}