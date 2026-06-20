import { useState } from "react";
import { Bell, BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";

/** Sininho no cabeçalho: ativa as notificações do sistema para os lembretes. */
export function ReminderBell() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [perm, setPerm] = useState<NotificationPermission>(
    supported ? Notification.permission : "denied"
  );

  if (!supported) return null;

  const handleClick = async () => {
    if (perm === "granted") {
      toast.success("Lembretes já estão ativados 🔔");
      return;
    }
    if (perm === "denied") {
      toast.error(
        "Notificações bloqueadas. Ative no cadeado 🔒 ao lado do endereço do site."
      );
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPerm(result);
      if (result === "granted") {
        toast.success(
          "Lembretes ativados! Você será avisado antes dos seus compromissos."
        );
        new Notification("CoffePlanner", {
          body: "Lembretes ativados com sucesso! 🔔",
          silent: true,
        });
      } else {
        toast("Tudo bem — você pode ativar os lembretes quando quiser.");
      }
    } catch {
      toast.error("Não foi possível ativar os lembretes.");
    }
  };

  const Icon = perm === "granted" ? BellRing : perm === "denied" ? BellOff : Bell;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Lembretes de compromissos"
      title={perm === "granted" ? "Lembretes ativados" : "Ativar lembretes"}
      className="touch-target relative rounded-lg bg-muted p-1.5 text-foreground transition hover:bg-primary/15 hover:text-primary sm:p-2"
    >
      <Icon className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" />
      {perm !== "granted" ? (
        <span
          className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
