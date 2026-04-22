import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ActionButtonVariant = "primary" | "secondary" | "accent";
type ActionButtonSize = "sm" | "md";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  icon?: ReactNode;
};

/** Um só contorno: hairline interno + sombra — sem border CSS (evita “dupla moldura”). */
const variantClass: Record<ActionButtonVariant, string> = {
  primary:
    "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-12px_20px_rgba(127,29,29,0.35),0_4px_14px_-4px_rgba(0,0,0,0.45),0_0_20px_-6px_rgba(239,68,68,0.25)]",
  secondary:
    "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-10px_18px_rgba(0,0,0,0.35),0_4px_14px_-4px_rgba(0,0,0,0.5)]",
  accent:
    "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-12px_20px_rgba(8,47,73,0.28),0_4px_14px_-4px_rgba(0,0,0,0.4),0_0_18px_-6px_rgba(34,211,238,0.22)]",
};

const tintClass: Record<ActionButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-white/15 via-red-500/20 to-red-950/38 group-hover:from-white/18 group-hover:via-red-500/24 group-hover:to-red-950/42",
  secondary:
    "bg-gradient-to-b from-white/12 via-white/5 to-zinc-950/42 group-hover:from-white/15 group-hover:via-white/7 group-hover:to-zinc-950/48",
  accent:
    "bg-gradient-to-b from-white/14 via-teal-400/16 to-teal-950/38 group-hover:from-white/17 group-hover:via-teal-400/20 group-hover:to-teal-950/44",
};

const sizeClass: Record<ActionButtonSize, string> = {
  sm: "min-h-[40px] rounded-full px-3 py-2 text-xs sm:min-h-[44px] sm:px-4 sm:py-2.5 sm:text-sm",
  md: "min-h-[44px] rounded-full px-4 py-2.5 text-sm",
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
        "group relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-full border-0 bg-white/[0.06] font-medium backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150 transition-all duration-200 active:translate-y-px active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0 [&_svg]:text-white/95",
        variantClass[variant],
        sizeClass[size],
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full",
          tintClass[variant]
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-70"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/4 w-2/5 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-500 group-hover:left-full group-hover:opacity-80"
      />
      <span className="relative z-[1] inline-flex items-center justify-center gap-1.5">
        {icon ? <span className="shrink-0">{icon}</span> : null}
        {children}
      </span>
    </button>
  );
}
