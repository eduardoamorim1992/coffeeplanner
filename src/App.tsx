import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";

import DivisionPage from "@/pages/DivisionPage";
import Dashboard from "@/components/Dashboard";
import Login from "@/pages/Login";
import AdminUsers from "@/pages/AdminUsers";
import AlterarSenha from "@/pages/AlterarSenha";

function getUser() {
  return JSON.parse(
    localStorage.getItem("user_profile") || "null"
  );
}

function PrivateRoute({ children }: any) {
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function ProtectedDivision() {
  const { divisionId } = useParams();
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;

  // Admin e coordenador acessam qualquer divisão
  if (
    user.role === "admin" ||
    user.role === "coordenador"
  ) {
    return <DivisionPage />;
  }

  // Usuário normal só acessa sua divisão
  if (
    String(user.division_id) !==
    String(divisionId)
  ) {
    return (
      <Navigate
        to={`/${user.division_id}`}
        replace
      />
    );
  }

  return <DivisionPage />;
}

function ProtectedDashboard() {
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;

  if (
    user.role !== "admin" &&
    user.role !== "coordenador"
  ) {
    return (
      <Navigate
        to={`/${user.division_id}`}
        replace
      />
    );
  }

  return <Dashboard />;
}

function ProtectedAdmin() {
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== "admin") {
    return (
      <Navigate
        to={`/${user.division_id}`}
        replace
      />
    );
  }

  return <AdminUsers />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <ProtectedDashboard />
            </PrivateRoute>
          }
        />

        {/* 🔥 ROTA ADMIN (TEM QUE VIR ANTES DE /:divisionId) */}
        <Route
          path="/admin/users"
          element={
            <PrivateRoute>
              <ProtectedAdmin />
            </PrivateRoute>
          }
        /><Route
  path="/alterar-senha"
  element={
    <PrivateRoute>
      <AlterarSenha />
    </PrivateRoute>
  }
/>

        {/* DIVISÕES */}
        <Route
          path="/:divisionId"
          element={
            <PrivateRoute>
              <ProtectedDivision />
            </PrivateRoute>
          }
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}