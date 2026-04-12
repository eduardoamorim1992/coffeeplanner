import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, Sparkles, X } from "lucide-react";
import { playNotificationChime } from "@/lib/playNotificationChime";
import { cn } from "@/lib/utils";

const DESKTOP_MIN_PX = 768;

export type DesktopNotifyVariant = "success" | "info" | "default";

export type DesktopNotifyPayload = {
  title: string;
  description?: string;
  /** Padrão ~5,2s */
  durationMs?: number;
  /** Padrão true */
  playSound?: boolean;
  variant?: DesktopNotifyVariant;
};

type DesktopNotifyContextValue = {
  /** Só tem efeito em viewport ≥768px; em mobile não faz nada (use toast). */
  notify: (payload: DesktopNotifyPayload) => void;
};

const DesktopNotifyContext = createContext<DesktopNotifyContextValue | null>(
  null
);

function isDesktopViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(`(min-width: ${DESKTOP_MIN_PX}px)`).matches
  );
}

export function DesktopNotifyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<DesktopNotifyPayload | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const close = useCallback(() => {
    clearTimer();
    setOpen(false);
    window.setTimeout(() => setPayload(null), 200);
  }, []);

  const notify = useCallback((p: DesktopNotifyPayload) => {
    if (!isDesktopViewport()) return;

    clearTimer();
    setPayload({
      ...p,
      durationMs: p.durationMs ?? 5200,
      playSound: p.playSound !== false,
      variant: p.variant ?? "default",
    });
    setOpen(true);

    if (p.playSound !== false) {
      queueMicrotask(() => playNotificationChime());
    }

    const ms = p.durationMs ?? 5200;
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      window.setTimeout(() => setPayload(null), 200);
    }, ms);
  }, []);

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const variant = payload?.variant ?? "default";
  const Icon =
    variant === "success"
      ? CheckCircle2
      : variant === "info"
        ? Info
        : Sparkles;

  const iconWrap =
    variant === "success"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : variant === "info"
        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
        : "bg-primary/15 text-primary";

  const overlay =
    open && payload ? (
      <div
        className="fixed inset-0 z-[350] flex items-center justify-center p-6"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-200"
          aria-label="Fechar notificação"
          onClick={close}
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="desktop-notify-title"
          aria-describedby={
            payload.description ? "desktop-notify-desc" : undefined
          }
          className={cn(
            "relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl",
            "animate-in fade-in zoom-in-95 duration-300"
          )}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex gap-4 pr-8">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                iconWrap
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={2} />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2
                id="desktop-notify-title"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {payload.title}
              </h2>
              {payload.description ? (
                <p
                  id="desktop-notify-desc"
                  className="mt-2 text-sm leading-relaxed text-muted-foreground"
                >
                  {payload.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={close}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <DesktopNotifyContext.Provider value={{ notify }}>
      {children}
      {typeof document !== "undefined" && overlay
        ? createPortal(overlay, document.body)
        : null}
    </DesktopNotifyContext.Provider>
  );
}

export function useDesktopNotify(): DesktopNotifyContextValue {
  const ctx = useContext(DesktopNotifyContext);
  if (!ctx) {
    throw new Error(
      "useDesktopNotify deve ser usado dentro de DesktopNotifyProvider"
    );
  }
  return ctx;
}
