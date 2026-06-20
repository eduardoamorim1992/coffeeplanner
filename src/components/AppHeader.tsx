import { ThemeToggle } from "@/components/ThemeToggle";
import { AccentThemePicker } from "@/components/AccentThemePicker";
import { TutorialHelpButton } from "@/components/TutorialHelp";

interface AppHeaderProps {
  divisionName: string;
}

export function AppHeader({ divisionName }: AppHeaderProps) {
  return (
    <header className="relative z-30 flex min-h-12 shrink-0 items-center justify-between gap-1.5 border-b border-border bg-background/95 px-2 pl-safe pr-safe pt-safe backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sm:min-h-14 sm:gap-2 sm:px-3 sm:pt-0 md:h-16 md:px-6">

      {/* ESQUERDA — reserva espaço do menu hambúrguer no mobile */}
      <h1 className="max-w-[min(58vw,15rem)] truncate pl-12 text-sm font-semibold leading-tight sm:max-w-[50%] sm:text-base md:max-w-none md:pl-0 md:text-lg">
        {divisionName}
      </h1>

      {/* DIREITA */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-4">
        <TutorialHelpButton collapsedLabel />
        <AccentThemePicker />
        <ThemeToggle />
      </div>

    </header>
  );
}
