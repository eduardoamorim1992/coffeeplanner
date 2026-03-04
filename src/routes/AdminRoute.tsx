import { Navigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: Props) {
  const user = JSON.parse(
    localStorage.getItem("user_profile") || "null"
  );

  // Não logado
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Não é admin
  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}