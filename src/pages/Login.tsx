import { useState } from "react";
import { users } from "@/data/users";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      alert("Usuário ou senha inválidos");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));

    if (user.role === "coordenador") {
  navigate("/dashboard");
    } else {
  navigate(`/${user.role}`);
     }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass-card p-8 w-80 space-y-4">
        <h2 className="text-lg font-semibold text-center">Login</h2>

        <input
          type="text"
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 rounded bg-muted/30 border border-border text-sm"
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded bg-muted/30 border border-border text-sm"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-primary text-white py-2 rounded text-sm hover:opacity-90"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}