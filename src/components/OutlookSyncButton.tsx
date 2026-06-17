import { useCallback, useEffect, useState } from "react";
import { CalendarCheck2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  getOutlookStatus,
  startOutlookConnect,
  syncOutlook,
} from "@/lib/outlookApi";

interface OutlookSyncButtonProps {
  /** Chamado quando a sincronização importou compromissos novos (para recarregar a agenda). */
  onSynced?: () => void;
}

/**
 * Botão único que cuida de todo o fluxo do Outlook:
 *  - "Conectar Outlook" quando ainda não conectado;
 *  - "Sincronizar Outlook" depois de conectado;
 *  - trata o retorno do login (?outlook=conectado) e sincroniza sozinho.
 */
export function OutlookSyncButton({ onSynced }: OutlookSyncButtonProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getOutlookStatus();
      setConnected(status.connected);
    } catch {
      setConnected(false);
    }
  }, []);

  const runSync = useCallback(
    async (silent = false) => {
      setBusy(true);
      try {
        const result = await syncOutlook();
        setConnected(true);
        if (!silent || result.inserted > 0) {
          toast.success(
            result.inserted > 0
              ? `Outlook sincronizado: ${result.inserted} compromisso(s) novo(s).`
              : "Outlook sincronizado. Nenhum compromisso novo."
          );
        }
        if (result.inserted > 0) onSynced?.();
      } catch (e) {
        const err = e as Error & { connected?: boolean };
        if (err.connected === false) {
          setConnected(false);
          if (!silent) {
            toast.error("A conexão com o Outlook expirou. Conecte novamente.");
          }
        } else if (!silent) {
          toast.error(err.message || "Falha ao sincronizar o Outlook.");
        }
      } finally {
        setBusy(false);
      }
    },
    [onSynced]
  );

  // Status inicial + tratamento do retorno do OAuth (?outlook=...).
  useEffect(() => {
    let active = true;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const outlook = params.get("outlook");

      if (outlook) {
        const msg = params.get("msg");
        // Remove os parâmetros da URL sem recarregar a página.
        params.delete("outlook");
        params.delete("msg");
        const query = params.toString();
        window.history.replaceState(
          {},
          "",
          window.location.pathname + (query ? `?${query}` : "")
        );

        if (outlook === "conectado") {
          if (!active) return;
          setConnected(true);
          toast.success("Outlook conectado! Importando seus compromissos…");
          runSync(true);
          return;
        }
        if (outlook === "erro") {
          toast.error(msg || "Não foi possível conectar ao Outlook.");
        }
      }

      if (active) await refreshStatus();
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setBusy(true);
    try {
      await startOutlookConnect(); // redireciona o navegador
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível iniciar a conexão.");
      setBusy(false);
    }
  };

  // Ainda verificando o status — não renderiza nada para evitar "piscar".
  if (connected === null) return null;

  if (!connected) {
    return (
      <ActionButton
        onClick={handleConnect}
        disabled={busy}
        variant="accent"
        className="w-full sm:w-auto"
        icon={
          busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <CalendarCheck2 className="h-4 w-4" aria-hidden />
          )
        }
      >
        {busy ? "Abrindo…" : "Conectar Outlook"}
      </ActionButton>
    );
  }

  return (
    <ActionButton
      onClick={() => runSync(false)}
      disabled={busy}
      variant="secondary"
      className="w-full sm:w-auto"
      icon={
        busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden />
        )
      }
    >
      {busy ? "Sincronizando…" : "Sincronizar Outlook"}
    </ActionButton>
  );
}
