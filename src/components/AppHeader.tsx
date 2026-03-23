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
    <header className="min-h-14 sm:h-16 border-b border-border flex items-center justify-between gap-2 pl-safe pr-safe pt-safe sm:pt-0 px-3 sm:px-6 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 shrink-0">

      {/* ESQUERDA — reserva espaço do menu hambúrguer no mobile */}
      <h1 className="text-base sm:text-lg font-semibold truncate pl-11 md:pl-0 max-w-[55vw] sm:max-w-[50%] md:max-w-none">
        {divisionName}
      </h1>

      {/* DIREITA */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
            {userName[0]?.toUpperCase()}
          </div>
          <span className="hidden sm:inline text-sm text-muted-foreground max-w-[100px] md:max-w-none truncate">
            {userName}
          </span>
        </div>

        <ThemeToggle />

      </div>

    </header>
  );
}