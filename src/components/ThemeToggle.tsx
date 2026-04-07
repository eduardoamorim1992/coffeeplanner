import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {

  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
      className="touch-target rounded-lg bg-muted p-1.5 text-foreground transition hover:bg-primary/15 hover:text-primary sm:p-2"
    >
      {theme === "dark" ? (
        <Sun className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" />
      ) : (
        <Moon className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" />
      )}
    </button>
  );
}