import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ActionButtonVariant = "primary" | "secondary" | "accent";
type ActionButtonSize = "sm" | "md";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  icon?: ReactNode;
};

const variantClass: Record<ActionButtonVariant, string> = {
  primary:
    "text-black shadow-[inset_0_2px_2px_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(255,255,255,0.18),0_8px_14px_-10px_rgba(239,68,68,0.6)]",
  secondary:
    "text-black shadow-[inset_0_2px_2px_rgba(255,255,255,0.42),inset_0_-1px_2px_rgba(255,255,255,0.16),0_10px_18px_-12px_rgba(0,0,0,0.7)]",
  accent:
    "text-black shadow-[inset_0_2px_2px_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(255,255,255,0.18),0_8px_14px_-10px_rgba(34,211,238,0.55)]",
};

const tintClass: Record<ActionButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-red-300/30 via-red-500/20 to-red-900/35 group-hover:from-red-200/35 group-hover:via-red-500/24 group-hover:to-red-900/40",
  secondary:
    "bg-gradient-to-b from-zinc-300/22 via-zinc-500/12 to-zinc-900/30 group-hover:from-zinc-200/26 group-hover:via-zinc-500/16 group-hover:to-zinc-900/34",
  accent:
    "bg-gradient-to-b from-cyan-300/30 via-cyan-500/18 to-cyan-900/34 group-hover:from-cyan-200/35 group-hover:via-cyan-500/22 group-hover:to-cyan-900/38",
};

const sizeClass: Record<ActionButtonSize, string> = {
  sm: "min-h-[40px] rounded-lg px-3 py-2 text-xs sm:min-h-[44px] sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm",
  md: "min-h-[44px] rounded-xl px-4 py-2.5 text-sm",
};

export function ActionButton({
  className,
  variant = "secondary",
  size = "sm",
  icon,
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "group relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-[999px] border border-black/35 bg-[linear-gradient(-75deg,rgba(255,255,255,0.04),rgba(255,255,255,0.18),rgba(255,255,255,0.04))] font-medium backdrop-blur-md transition-all duration-300 active:translate-y-[1px] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-60 dark:border-white/12",
        variantClass[variant],
        sizeClass[size],
        className
      )}
    >
      <span aria-hidden className={cn("pointer-events-none absolute inset-0 rounded-[999px]", tintClass[variant])} />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[1px] rounded-[999px] bg-gradient-to-b from-white/38 via-white/10 to-transparent opacity-75"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-[10%] top-[10%] h-[40%] w-[46%] rounded-full bg-white/50 opacity-70 blur-[2px] transition-opacity duration-200 group-hover:opacity-90"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-[12%] -left-1/3 w-1/3 -skew-x-12 rounded-full bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 blur-[1px] transition-all duration-700 group-hover:left-[115%] group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[16%] bottom-[12%] h-[16%] rounded-full bg-white/20 opacity-30 blur-[6px]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[8%] bottom-[5%] h-[12%] rounded-full bg-black/30 opacity-40 blur-[6px]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[999px] shadow-[inset_0_-1px_2px_rgba(0,0,0,0.28)]"
      />
      <span className="relative z-[1] inline-flex items-center justify-center gap-1.5">
        {icon ? <span className="shrink-0">{icon}</span> : null}
        {children}
      </span>
    </button>
  );
}
