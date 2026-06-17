import { useEffect, useMemo, useRef, type CSSProperties } from "react";

/** Cor base fixa (igual ao tema escuro do app) — não usa `bg-background` para nunca ficar branco. */
const BG_BASE = "hsl(220 20% 7%)";

/**
 * Fundo da tela de login: sempre escuro; gradiente segue o mouse + orbs animadas.
 */
export function LoginMouseBackground() {
  const layerRef = useRef<HTMLDivElement>(null);

  // Partículas flutuantes (geradas uma vez) — dão vida ao fundo.
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        left: Math.round(Math.random() * 100),
        bottom: -10 + Math.round(Math.random() * 70),
        size: 5 + Math.round(Math.random() * 10),
        dur: 11 + Math.round(Math.random() * 12),
        delay: Math.round(Math.random() * 10),
        op: Number((0.45 + Math.random() * 0.4).toFixed(2)),
        color:
          i % 3 === 0
            ? "hsl(0 80% 65%)"
            : i % 3 === 1
              ? "hsl(350 70% 75%)"
              : "hsl(30 40% 85%)",
      })),
    []
  );

  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", `${e.clientX}px`);
        el.style.setProperty("--my", `${e.clientY}px`);
      });
    };

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    el.style.setProperty("--mx", `${cx}px`);
    el.style.setProperty("--my", `${cy}px`);

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  const cursorGlow = `
    radial-gradient(
      480px circle at var(--mx, 50%) var(--my, 50%),
      hsl(0 72% 52% / 0.2),
      transparent 55%
    ),
    radial-gradient(
      220px circle at var(--mx, 50%) var(--my, 50%),
      hsl(350 70% 70% / 0.09),
      transparent 40%
    )
  `;

  return (
    <div
      ref={layerRef}
      className="login-mouse-bg pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
      style={{ backgroundColor: BG_BASE }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: BG_BASE }} />

      <div className="login-bg-orb login-bg-orb-a absolute rounded-full bg-[hsl(0_72%_51%/0.14)] blur-[80px]" />
      <div className="login-bg-orb login-bg-orb-b absolute rounded-full bg-[hsl(217_60%_45%/0.12)] blur-[90px]" />
      <div className="login-bg-orb login-bg-orb-c absolute rounded-full bg-[hsl(0_72%_51%/0.1)] blur-[70px]" />

      {particles.map((p, i) => (
        <span
          key={i}
          className="login-particle"
          style={
            {
              left: `${p.left}%`,
              bottom: `${p.bottom}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              color: p.color,
              "--dur": `${p.dur}s`,
              "--delay": `${p.delay}s`,
              "--op": p.op,
            } as CSSProperties
          }
        />
      ))}

      <div
        className="login-mouse-follow absolute inset-0"
        style={{ background: cursorGlow }}
      />

      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(220 15% 28% / 0.55) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}
