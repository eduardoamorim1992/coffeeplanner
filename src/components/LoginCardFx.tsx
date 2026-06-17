import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Embrulho do card de login com efeitos "liquid glass":
 *  - entrada animada (fade + sobe) no wrapper;
 *  - inclinação 3D suave seguindo o mouse no card;
 *  - brilho de vidro deslizante.
 * Não altera o conteúdo/lógica do formulário — só envolve.
 */
export function LoginCardFx({ children }: { children: ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    const onMove = (e: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        const max = 11; // graus
        card.style.setProperty("--ry", `${clamp(dx) * max}deg`);
        card.style.setProperty("--rx", `${clamp(dy) * -max}deg`);
      });
    };

    const reset = () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("blur", reset);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return (
    <div
      className="login-card-enter relative z-10 w-full max-w-sm"
      style={{ perspective: "1100px" } as CSSProperties}
    >
      <div
        ref={cardRef}
        className="glass-card login-card-tilt relative w-full overflow-hidden p-8"
      >
        <div className="relative z-10 space-y-4">{children}</div>
        <span className="login-card-shine" aria-hidden />
      </div>
    </div>
  );
}
