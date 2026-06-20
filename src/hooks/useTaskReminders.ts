import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useDesktopNotify } from "@/contexts/DesktopNotifyContext";
import { playNotificationChime } from "@/lib/playNotificationChime";

/** Quantos minutos antes do compromisso avisar. */
const LEAD_MIN = 10;
/** De quanto em quanto tempo verificar (ms). */
const CHECK_MS = 45_000;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function parseHora(h: string | null): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(h || "");
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function remindedKey(iso: string): string {
  return `reminded:${iso}`;
}

function getReminded(iso: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(remindedKey(iso)) || "[]"));
  } catch {
    return new Set();
  }
}

function saveReminded(iso: string, set: Set<string>) {
  localStorage.setItem(remindedKey(iso), JSON.stringify([...set]));
  // Limpa marcações de dias anteriores.
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith("reminded:") && k !== remindedKey(iso)) {
      localStorage.removeItem(k);
    }
  }
}

/**
 * Verifica periodicamente os compromissos de hoje (com horário, não concluídos)
 * do usuário logado e dispara um lembrete ~10 min antes de cada um:
 * notificação do sistema (se permitida) + alerta interno + som. Cada compromisso
 * só avisa uma vez por dia.
 */
export function useTaskReminders() {
  const { notify } = useDesktopNotify();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function resolveUserId(): Promise<string | null> {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return null;

      let row = (
        await supabase.from("users").select("id").eq("id", user.id).maybeSingle()
      ).data as { id: string } | null;
      if (!row && user.email) {
        row = (
          await supabase
            .from("users")
            .select("id")
            .eq("email", user.email.toLowerCase())
            .maybeSingle()
        ).data as { id: string } | null;
      }
      return row?.id ?? null;
    }

    function fireReminder(titulo: string, hora: string, minsLeft: number) {
      const clean = (titulo || "Compromisso").replace(/^\[(Outlook|ICS)\]\s*/, "");
      const body =
        minsLeft <= 0 ? `Agora — ${hora}` : `Em ${minsLeft} min — às ${hora}`;

      try {
        if ("Notification" in window && Notification.permission === "granted") {
          const n = new Notification(`🔔 ${clean}`, {
            body,
            tag: `${todayIso()}-${hora}-${clean}`,
            silent: true,
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        }
      } catch {
        /* ignore */
      }

      // Alerta interno (desktop) + som — sempre, mesmo sem permissão do sistema.
      notify({ title: clean, description: body, variant: "info", playSound: false });
      playNotificationChime();
    }

    async function check() {
      const userId = userIdRef.current;
      if (!userId || cancelled) return;

      const iso = todayIso();
      const { data: tasks, error } = await supabase
        .from("atividades")
        .select("titulo, hora, completed")
        .eq("user_id", userId)
        .eq("data", iso)
        .eq("completed", false);

      if (error || !tasks || cancelled) return;

      // Briefing do dia — 1x por dia, no primeiro acesso.
      const briefKey = `briefing:${iso}`;
      if (!localStorage.getItem(briefKey)) {
        localStorage.setItem(briefKey, "1");
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith("briefing:") && k !== briefKey) {
            localStorage.removeItem(k);
          }
        }
        const pend = tasks as { titulo: string; hora: string | null }[];
        if (pend.length > 0) {
          const comTempo = pend
            .filter((t) => parseHora(t.hora) != null)
            .sort(
              (a, b) =>
                (parseHora(a.hora) as number) - (parseHora(b.hora) as number)
            );
          const prox = comTempo[0];
          const proxTxt = prox
            ? `Próximo: ${prox.hora} — ${(prox.titulo || "").replace(
                /^\[(Outlook|ICS)\]\s*/,
                ""
              )}`
            : "Tenha um ótimo dia!";
          const titulo = `📅 Você tem ${pend.length} compromisso${
            pend.length > 1 ? "s" : ""
          } hoje`;
          try {
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              const n = new Notification(titulo, { body: proxTxt, silent: true });
              n.onclick = () => {
                window.focus();
                n.close();
              };
            }
          } catch {
            /* ignore */
          }
          notify({
            title: titulo,
            description: proxTxt,
            variant: "info",
            playSound: false,
          });
          playNotificationChime();
        }
      }

      const reminded = getReminded(iso);
      const now = nowMinutes();
      let changed = false;

      for (const t of tasks as { titulo: string; hora: string | null }[]) {
        const tm = parseHora(t.hora);
        if (tm == null) continue;
        const key = `${t.hora}|${(t.titulo || "").trim().toLowerCase()}`;
        if (reminded.has(key)) continue;
        if (now >= tm - LEAD_MIN && now <= tm) {
          fireReminder(t.titulo, t.hora as string, tm - now);
          reminded.add(key);
          changed = true;
        }
      }

      if (changed) saveReminded(iso, reminded);
    }

    resolveUserId().then((id) => {
      if (cancelled) return;
      userIdRef.current = id;
      check();
      timer = setInterval(check, CHECK_MS);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        userIdRef.current = null;
        return;
      }
      resolveUserId().then((id) => {
        if (!cancelled) userIdRef.current = id;
      });
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      sub.subscription.unsubscribe();
    };
  }, [notify]);
}
