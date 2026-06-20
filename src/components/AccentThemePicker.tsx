import { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { useAccent } from "@/hooks/useAccent";

/** Botão no cabeçalho que abre um menu com os temas de cor. */
export function AccentThemePicker() {
  const { accent, setAccent, accents } = useAccent();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Tema de cor"
        aria-expanded={open}
        className="touch-target rounded-lg bg-muted p-1.5 text-foreground transition hover:bg-primary/15 hover:text-primary sm:p-2"
      >
        <Palette className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-border bg-card p-2 shadow-lg dark:bg-zinc-900">
          <p className="px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tema de cor
          </p>
          <div className="flex flex-col gap-0.5">
            {accents.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setAccent(a.id);
                  setOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition hover:bg-muted"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/15 dark:ring-white/20"
                  style={{ background: a.swatch }}
                  aria-hidden
                />
                <span className="flex-1">{a.label}</span>
                {accent === a.id ? (
                  <Check className="h-4 w-4 text-primary" aria-hidden />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
