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

function getUser() {
  return JSON.parse(localStorage.getItem("user_profile") || "null");
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

  // Admin acessa qualquer divisão
  if (user.role === "admin" || user.role === "coordenador") {
    return <DivisionPage />;
  }

  // Usuário normal só acessa sua divisão
  if (String(user.division_id) !== String(divisionId)) {
    return <Navigate to={`/${user.division_id}`} replace />;
  }

  return <DivisionPage />;
}

function ProtectedDashboard() {
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== "admin" && user.role !== "coordenador") {
    return <Navigate to={`/${user.division_id}`} replace />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <ProtectedDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/:divisionId"
          element={
            <PrivateRoute>
              <ProtectedDivision />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}