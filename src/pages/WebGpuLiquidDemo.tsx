import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Cpu, ExternalLink } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";

/**
 * O código que você colou é um demo WebGPU (TypeGPU + raymarching), não um <button> CSS.
 * Ele depende de vários arquivos do mesmo exemplo (slider, camera, events, utils, TAA, etc.).
 *
 * Pacotes já instalados no projeto: `typegpu`, `@typegpu/sdf`, `@typegpu/noise`.
 * Próximo passo: copiar a pasta completa do exemplo do repositório TypeGPU para `src/experimental/`
 * e montar o canvas dentro de um `useEffect` aqui (ou import dinâmico).
 *
 * Docs: https://docs.swmansion.com/TypeGPU/
 * Repo: https://github.com/software-mansion/TypeGPU
 */
export default function WebGpuLiquidDemo() {
  const navigate = useNavigate();
  const webgpu = useMemo(
    () => typeof navigator !== "undefined" && !!navigator.gpu,
    []
  );

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-2">
          <Cpu className="h-8 w-8 text-primary" aria-hidden />
          <h1 className="text-xl font-semibold">Demo WebGPU (liquid glass)</h1>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          O trecho TypeGPU que você enviou renderiza um <strong className="text-foreground">canvas WebGPU</strong> com
          sombras, SDF e pós-processamento. Isso não substitui o{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">ActionButton</code> do app — é outro stack
          (GPU + dezenas de arquivos do exemplo).
        </p>

        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            webgpu
              ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-100"
              : "border-amber-800/50 bg-amber-950/30 text-amber-100"
          }`}
        >
          {webgpu
            ? "Este navegador expõe WebGPU (navigator.gpu). Você pode colar o demo completo aqui."
            : "Este navegador não expõe WebGPU. Teste no Chrome/Edge atualizado ou ative flags de WebGPU."}
        </div>

        <div className="rounded-xl border border-border bg-card/80 p-4 space-y-3">
          <p className="text-sm font-medium">Como integrar de verdade</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              No repositório{" "}
              <a
                className="text-primary underline underline-offset-2"
                href="https://github.com/software-mansion/TypeGPU"
                target="_blank"
                rel="noreferrer"
              >
                software-mansion/TypeGPU
              </a>
              , localize a pasta do exemplo “liquid / glass” (mesmo código dos seus imports).
            </li>
            <li>
              Copie todos os <code className="text-xs">.ts</code> dependentes para{" "}
              <code className="text-xs">src/experimental/liquidGlass/</code> mantendo imports relativos.
            </li>
            <li>
              No ponto de entrada do exemplo, troque{" "}
              <code className="text-xs">document.querySelector(&apos;canvas&apos;)</code> por uma{" "}
              <code className="text-xs">ref</code> do React e rode o init dentro de{" "}
              <code className="text-xs">useEffect</code> com cleanup (cancelAnimationFrame, destroy).
            </li>
          </ol>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <ActionButton
            type="button"
            variant="secondary"
            className="w-full flex-1"
            icon={<ExternalLink className="h-4 w-4" />}
            onClick={() =>
              window.open(
                "https://docs.swmansion.com/TypeGPU/getting-started",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            Getting started TypeGPU
          </ActionButton>
          <ActionButton
            type="button"
            variant="primary"
            className="w-full flex-1"
            onClick={() => navigate("/dashboard")}
          >
            Voltar ao app
          </ActionButton>
        </div>
        <p className="text-[11px] text-muted-foreground">
          A rota <code className="rounded bg-muted px-1">/demo/webgpu-liquid</code> é só um lugar reservado para
          você plugar o canvas quando os arquivos do exemplo estiverem no repo.
        </p>
      </div>
    </div>
  );
}
