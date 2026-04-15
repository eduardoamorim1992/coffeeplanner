import { ThemeToggle } from "@/components/ThemeToggle";
import { TutorialHelpButton } from "@/components/TutorialHelp";

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
    <header className="flex min-h-12 shrink-0 items-center justify-between gap-1.5 border-b border-border bg-background/95 px-2 pl-safe pr-safe pt-safe backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sm:min-h-14 sm:gap-2 sm:px-3 sm:pt-0 md:h-16 md:px-6">

      {/* ESQUERDA — reserva espaço do menu hambúrguer no mobile */}
      <h1 className="max-w-[min(58vw,15rem)] truncate pl-12 text-sm font-semibold leading-tight sm:max-w-[50%] sm:text-base md:max-w-none md:pl-0 md:text-lg">
        {divisionName}
      </h1>

      {/* DIREITA */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-4">

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground sm:h-9 sm:w-9 sm:text-xs md:h-8 md:w-8">
            {userName[0]?.toUpperCase()}
          </div>
          <span className="hidden sm:inline text-sm text-muted-foreground max-w-[100px] md:max-w-none truncate">
            {userName}
          </span>
        </div>

        <TutorialHelpButton collapsedLabel />

        <ThemeToggle />

      </div>

    </header>
  );
}