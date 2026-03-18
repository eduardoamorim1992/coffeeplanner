import { ThemeToggle } from "@/components/ThemeToggle";

interface AppHeaderProps {
  divisionName: string;
}

export function AppHeader({ divisionName }: AppHeaderProps) {

  const user = JSON.parse(
    localStorage.getItem("user_profile") || "null"
  );

  // 🔥 PEGA O EMAIL
  const email = user?.email || "";

  // 🔥 REMOVE O @ E O DOMÍNIO
  const userName = email.includes("@")
    ? email.split("@")[0]
    : "Usuário";

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background">

      {/* ESQUERDA */}
      <h1 className="text-lg font-semibold">
        {divisionName}
      </h1>

      {/* DIREITA */}
      <div className="flex items-center gap-4">

        {/* USUÁRIO */}
        <div className="flex items-center gap-2">

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
            {userName[0]?.toUpperCase()}
          </div>

          {/* Nome */}
          <span className="text-sm text-muted-foreground">
            {userName}
          </span>

        </div>

        {/* BOTÃO TEMA */}
        <ThemeToggle />

      </div>

    </header>
  );
}