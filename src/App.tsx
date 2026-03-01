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

function PrivateRoute({ children }: any) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) return <Navigate to="/login" />;

  return children;
}

function ProtectedDivision() {
  const { divisionId } = useParams();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) return <Navigate to="/login" />;

  if (user.role !== "coordenador" && user.role !== divisionId) {
    return <Navigate to={`/${user.role}`} />;
  }

  return <DivisionPage />;
}

function ProtectedDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) return <Navigate to="/login" />;

  if (user.role !== "coordenador") {
    return <Navigate to={`/${user.role}`} />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* DASHBOARD EXECUTIVO */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <ProtectedDashboard />
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

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}