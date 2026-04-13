import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/** Mesma base do tema escuro — evita flash branco no html/body nas rotas públicas de auth */
const AUTH_HTML_BG = "hsl(220, 20%, 7%)";

function isAuthPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/cadastro/obrigado" ||
    pathname === "/aguardando-aprovacao" ||
    pathname === "/definir-senha"
  );
}

/**
 * Ajusta fundo e color-scheme do <html> nas telas de login/cadastro/recuperação
 * para combinar com o fundo escuro fixo (SPA + tema claro no resto do app).
 */
export function AuthHtmlChrome() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const el = document.documentElement;
    const body = document.body;
    if (isAuthPublicPath(pathname)) {
      el.style.backgroundColor = AUTH_HTML_BG;
      el.style.colorScheme = "dark";
      body.style.backgroundColor = AUTH_HTML_BG;
      body.style.colorScheme = "dark";
    } else {
      el.style.backgroundColor = "";
      el.style.colorScheme = "";
      body.style.backgroundColor = "";
      body.style.colorScheme = "";
    }
  }, [pathname]);

  return null;
}
