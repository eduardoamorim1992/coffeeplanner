import { Navigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";

export default function ProtectedRoute({ children }: any) {
  const { user, loading } = useAuthUser();

  // 🔥 ESPERA carregar sessão
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        Carregando...
      </div>
    );
  }

  // 🔒 SEM LOGIN → LOGIN
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ LIBERADO
  return children;
}