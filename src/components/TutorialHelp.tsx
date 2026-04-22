import {
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Share2,
  Users,
  X,
  KeyRound,
  Sparkles,
  Repeat,
  RefreshCw,
  Link2,
  Lightbulb,
} from "lucide-react";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-muted/30 px-3 py-3 sm:px-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        {title}
      </h3>
      <div className="space-y-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {children}
      </div>
    </section>
  );
}

export function TutorialModal({ onClose }: { onClose: () => void }) {
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onKey]);

  const layer = (
    <div
      className="fixed inset-0 z-[100050] flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        aria-label="Fechar tutorial"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(90dvh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[0_25px_80px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/10 dark:bg-zinc-950 dark:ring-white/5"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p
              id="tutorial-title"
              className="text-base font-semibold leading-tight text-foreground"
            >
              Guia rápido — CoffePlanner
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Passo a passo para usar o sistema no dia a dia.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">
          <Section icon={Sparkles} title="Primeiro acesso">
            <p>
              Faça login com o email e senha cadastrados. Se ainda não tiver
              conta, use <strong className="text-foreground">Cadastrar novo usuário</strong>{" "}
              na tela de login — um administrador precisa aprovar antes você
              acessar o painel.
            </p>
          </Section>

          <Section icon={Users} title="Menu lateral (usuários)">
            <p>
              À esquerda aparecem os <strong className="text-foreground">usuários</strong>{" "}
              que você pode visualizar: você mesmo, sua equipe (se for gestor)
              ou colegas que autorizaram ver as atividades deles em{" "}
              <strong className="text-foreground">Compartilhamentos</strong>.
            </p>
            <p>
              Toque no nome para abrir o <strong className="text-foreground">calendário</strong>{" "}
              daquela pessoa. O número indica tarefas pendentes no dia.
            </p>
          </Section>

          <Section icon={CalendarDays} title="Calendário e atividades">
            <p>
              No calendário, adicione atividades por dia, marque como concluídas
              e use o gráfico ou a aba <strong className="text-foreground">OKR</strong>{" "}
              para acompanhar objetivos, quando disponível.
            </p>
            <p>
              Gestores costumam ver a equipe agregada; analistas veem em geral
              só o próprio planejamento, salvo permissões extras.
            </p>
          </Section>

          <Section icon={Repeat} title="Replicar na semana (ícone de repetir)">
            <p>
              Na visão <strong className="text-foreground">Semana</strong>, cada
              atividade tem um botão com ícone de repetir (azul). Ele abre um
              painel para escolher em quais{" "}
              <strong className="text-foreground">dias da semana</strong> do{" "}
              <strong className="text-foreground">mês atual</strong> você quer
              criar a mesma tarefa (mesmo texto, horário e prioridade).
            </p>
            <p>
              Há atalhos: dias da semana que já têm atividades nesta semana,
              segunda a sexta, semana inteira ou só o mesmo dia da semana da
              tarefa original. O sistema não duplica se já existir uma combinação
              igual (data + hora + título + prioridade).
            </p>
          </Section>

          <Section icon={RefreshCw} title="Replicar para o próximo mês (botão azul)">
            <p>
              No topo do calendário, o botão{" "}
              <strong className="text-foreground">Replicar p/ próximo mês</strong>{" "}
              usa o <strong className="text-foreground">mês que está visível</strong>{" "}
              na aba <strong className="text-foreground">Mensal</strong> como
              origem. Depois de confirmar, o sistema copia cada atividade desse
              mês para <strong className="text-foreground">todas as datas do mês seguinte</strong>{" "}
              que coincidem com o <strong className="text-foreground">mesmo dia da semana</strong>{" "}
              (ex.: toda segunda, toda terça…). Atividades já existentes no
              destino com o mesmo horário e título são ignoradas.
            </p>
            <p>
              Esse botão só aparece quando você está vendo{" "}
              <strong className="text-foreground">o seu próprio calendário</strong>{" "}
              (não o de outro usuário no menu lateral).
            </p>
          </Section>

          <Section icon={Link2} title="Importar calendário (ICS)">
            <p>
              Toque em <strong className="text-foreground">Importar calendário (ICS)</strong>,{" "}
              cole o <strong className="text-foreground">link de assinatura</strong>{" "}
              do Outlook, Google ou outro serviço que publique um arquivo{" "}
              <strong className="text-foreground">.ics</strong>. O endereço fica
              salvo neste navegador.
            </p>
            <p>
              Use <strong className="text-foreground">Sincronizar agora</strong>{" "}
              para buscar os próximos eventos e criar atividades no seu
              planejamento. Elas aparecem com o prefixo{" "}
              <strong className="text-foreground">[ICS]</strong> no título, para
              distinguir do que você cadastrou manualmente. Também só está
              disponível no <strong className="text-foreground">seu calendário</strong>.
            </p>
          </Section>

          <Section icon={Lightbulb} title="Insight rápido (notação rápida)">
            <p>
              O botão flutuante de <strong className="text-foreground">insight rápido</strong>{" "}
              (canto da tela) abre uma captura rápida: anote ideias em uma ou duas
              frases, use tags e modelos quando disponíveis, e salve na lista.
              Atalho de teclado:{" "}
              <strong className="text-foreground">Alt + Shift + I</strong>.
            </p>
            <p>
              Os insights ficam na sua conta: você pode editar, marcar como
              concluído, fixar, copiar ou exportar — são independentes do
              calendário de atividades.
            </p>
          </Section>

          <Section icon={LayoutDashboard} title="Dashboard">
            <p>
              O <strong className="text-foreground">Dashboard</strong>{" "}
              (menu superior, para perfis com acesso) mostra indicadores do
              período — visão da organização ou da sua equipe, conforme seu
              papel.
            </p>
          </Section>

          <Section icon={Share2} title="Compartilhamentos">
            <p>
              Em <strong className="text-foreground">Compartilhamentos</strong>{" "}
              você pode pedir por email permissão para ver as atividades de um
              colega. Ele aprova ou recusa; se aprovar, o nome dele aparece no
              menu para você acompanhar.
            </p>
          </Section>

          <Section icon={KeyRound} title="Senha e conta">
            <p>
              Use <strong className="text-foreground">Alterar senha</strong> no
              rodapé do menu quando quiser atualizar a senha. Em{" "}
              <strong className="text-foreground">Esqueci minha senha</strong>{" "}
              na tela de login você recebe um link por email para redefinir.
            </p>
          </Section>
        </div>

        <div className="shrink-0 border-t border-border bg-muted/20 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-95 active:scale-[0.99]"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;

  return createPortal(layer, document.body);
}

/** Botão que abre o guia (use no header ou em qualquer tela logada). */
export function TutorialHelpButton({
  className = "",
  collapsedLabel,
}: {
  className?: string;
  /** Se definido, esconde o texto em telas pequenas */
  collapsedLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionButton
        onClick={() => setOpen(true)}
        title="Como usar o sistema"
        variant="secondary"
        icon={<BookOpen className="h-4 w-4 text-white/95" aria-hidden />}
        className={className}
      >
        <span className={collapsedLabel ? "hidden sm:inline" : ""}>Tutorial</span>
      </ActionButton>
      {open ? <TutorialModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Link de texto para a tela de login (mesmo conteúdo do tutorial). */
export function LoginTutorialLink() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-center text-sm text-zinc-400 hover:text-white underline underline-offset-2"
      >
        Guia rápido — como usar o sistema
      </button>
      {open ? <TutorialModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
