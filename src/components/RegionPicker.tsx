import { useEffect, useRef, useState } from "react";
import { MapPin, Check } from "lucide-react";
import { useUserRegion } from "@/hooks/useUserRegion";

/** Chip compacto que mostra/ajusta o estado (UF) usado nos feriados estaduais. */
export function RegionPicker() {
  const { uf, setUf, ufs } = useUserRegion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Estado para feriados"
        aria-expanded={open}
        title="Feriados estaduais"
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 text-xs font-medium text-foreground transition hover:bg-muted dark:border-zinc-800/80 dark:bg-zinc-950/60 sm:h-11 sm:text-sm"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500 sm:h-4 sm:w-4" aria-hidden />
        {uf || "Estado"}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg dark:bg-zinc-900">
          <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Feriados estaduais
          </p>
          <button
            type="button"
            onClick={() => {
              setUf("");
              setOpen(false);
            }}
            className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-foreground transition hover:bg-muted"
          >
            <span>Nenhum (só nacionais)</span>
            {!uf ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
          </button>
          <div className="grid max-h-56 grid-cols-4 gap-1 overflow-y-auto">
            {ufs.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => {
                  setUf(u);
                  setOpen(false);
                }}
                className={`rounded-lg px-1.5 py-1.5 text-xs font-medium transition ${
                  uf === u
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
