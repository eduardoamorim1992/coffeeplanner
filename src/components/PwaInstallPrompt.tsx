import { useCallback, useEffect, useState } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_DISMISS_UNTIL = "pwa-install-dismiss-until";

/** Evento não tipado em todas as versões do TypeScript DOM. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isMobileUa(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function dismissExpired(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_DISMISS_UNTIL);
    if (!raw) return false;
    const until = parseInt(raw, 10);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function dismissForDays(days: number): void {
  try {
    localStorage.setItem(
      STORAGE_DISMISS_UNTIL,
      String(Date.now() + days * 86400000)
    );
  } catch {
    /* */
  }
}

/**
 * Banner no celular: Android (Chrome) usa prompt nativo de PWA;
 * iOS (Safari) mostra instruções para “Adicionar à Tela de Início”.
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = useCallback((days: number) => {
    dismissForDays(days);
    setShowAndroid(false);
    setShowIos(false);
    setDeferred(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isMobileUa()) return;
    if (isStandalone()) return;
    if (dismissExpired()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
      setShowIos(false);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isIos()) {
      timer = window.setTimeout(() => {
        if (dismissExpired() || isStandalone()) return;
        setShowIos(true);
      }, 2800);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const installAndroid = async () => {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* usuário cancelou ou navegador bloqueou */
    } finally {
      setBusy(false);
      setShowAndroid(false);
      setDeferred(null);
    }
  };

  if (!showAndroid && !showIos) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[200] px-3 pt-2",
        "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      )}
      role="dialog"
      aria-label="Instalar aplicativo"
    >
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-md dark:bg-zinc-950/95">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            {showIos ? (
              <Share2 className="h-5 w-5" />
            ) : (
              <Smartphone className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {showIos ? "Instalar como app" : "Instalar CoffePlanner"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {showIos ? (
                <>
                  No Safari, toque em{" "}
                  <span className="font-medium text-foreground">
                    Compartilhar
                  </span>{" "}
                  <Share2 className="inline h-3 w-3 align-text-bottom" /> e depois
                  em{" "}
                  <span className="font-medium text-foreground">
                    Adicionar à Tela de Início
                  </span>
                  . Abre em tela cheia, como um app.
                </>
              ) : (
                <>
                  Instale na tela inicial para abrir mais rápido, com ícone e
                  experiência de aplicativo.
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {showAndroid && deferred ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void installAndroid()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  {busy ? "Abrindo…" : "Instalar agora"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => close(7)}
                className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={() => close(90)}
                className="rounded-lg px-2 py-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Não perguntar por 90 dias
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => close(7)}
            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
