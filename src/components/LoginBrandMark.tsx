/**
 * Marca no canto da tela de login: ícone coffee.svg + título + fumaça animada sobre a xícara.
 */
export function LoginBrandMark() {
  return (
    <header className="pointer-events-none absolute left-4 top-4 z-20 flex max-w-[min(100%-2rem,20rem)] items-center gap-3 pt-safe pl-safe sm:left-6 sm:top-6">
      <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
        <div
          className="login-smoke-stack"
          aria-hidden
        >
          <span className="login-smoke login-smoke-a" />
          <span className="login-smoke login-smoke-b" />
          <span className="login-smoke login-smoke-c" />
        </div>
        <img
          src="/coffee.svg"
          alt=""
          width={56}
          height={56}
          decoding="async"
          className="relative z-[1] h-full w-full rounded-xl object-contain shadow-lg shadow-black/50 ring-1 ring-white/10"
        />
      </div>
      <h1 className="text-lg font-semibold leading-tight tracking-tight text-white drop-shadow-md sm:text-xl">
        Coffe Planner
      </h1>
    </header>
  );
}
