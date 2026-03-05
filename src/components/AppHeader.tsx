import { useNavigate } from "react-router-dom";

interface AppHeaderProps {
  divisionName: string;
}

export function AppHeader({ divisionName }: AppHeaderProps) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  function handleLogout() {
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background">
      
      {/* Nome da divisão */}
      <div>
        <h1 className="text-lg font-semibold">{divisionName}</h1>
      </div>

      {/* Área direita */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {user?.username}
        </span>
      </div>

    </header>
  );
}