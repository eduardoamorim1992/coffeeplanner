import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AlertCircle, Check, Loader2, Send, X } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Erro típico quando a migration ainda não foi aplicada no Supabase */
function isActivityShareTableMissing(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("activity_share_requests") &&
    (m.includes("could not find") ||
      m.includes("schema cache") ||
      m.includes("does not exist") ||
      m.includes("não existe"))
  );
}

function friendlyShareError(raw: string): string {
  if (isActivityShareTableMissing(raw)) {
    return "database_table_missing";
  }
  return raw;
}

type Row = {
  id: string;
  requester_id: string;
  target_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  responded_at: string | null;
};

export default function CompartilhamentoAtividades() {
  const navigate = useNavigate();
  const [meId, setMeId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [incoming, setIncoming] = useState<
    (Row & { otherNome: string; otherEmail: string })[]
  >([]);
  const [outgoing, setOutgoing] = useState<
    (Row & { otherNome: string; otherEmail: string })[]
  >([]);
  const [dbNotReady, setDbNotReady] = useState(false);

  const loadMe = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return null;
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email.trim().toLowerCase())
      .maybeSingle();
    const id = data?.id ?? user.id;
    setMeId(id);
    return id;
  }, []);

  const enrich = async (
    rows: Row[],
    otherKey: "requester_id" | "target_id"
  ): Promise<(Row & { otherNome: string; otherEmail: string })[]> => {
    const ids = [
      ...new Set(
        rows
          .map((r) => r[otherKey])
          .filter((x): x is string => typeof x === "string" && x.length > 0)
      ),
    ];
    if (ids.length === 0) return [];
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id, nome, email")
      .in("id", ids);
    if (usersErr) {
      throw new Error(usersErr.message);
    }
    const map = Object.fromEntries(
      (users || []).map((u) => [u.id, { nome: u.nome, email: u.email }])
    );
    return rows.map((r) => ({
      ...r,
      otherNome: map[r[otherKey]]?.nome || "—",
      otherEmail: map[r[otherKey]]?.email || "",
    }));
  };

  const loadLists = useCallback(
    async (opts?: { preserveMessage?: boolean }) => {
      if (!opts?.preserveMessage) {
        setMessage("");
      }
      setListLoading(true);
      try {
        const id = await loadMe();
        if (!id) {
          return;
        }

        const [incRes, outRes] = await Promise.all([
          supabase
            .from("activity_share_requests")
            .select("*")
            .eq("target_id", id)
            .order("created_at", { ascending: false }),
          supabase
            .from("activity_share_requests")
            .select("*")
            .eq("requester_id", id)
            .order("created_at", { ascending: false }),
        ]);

        if (incRes.error) {
          const raw = incRes.error.message;
          setDbNotReady(isActivityShareTableMissing(raw));
          setMessage(
            friendlyShareError(raw) === "database_table_missing" ? "" : raw
          );
          return;
        }
        if (outRes.error) {
          const raw = outRes.error.message;
          setDbNotReady(isActivityShareTableMissing(raw));
          setMessage(
            friendlyShareError(raw) === "database_table_missing" ? "" : raw
          );
          return;
        }

        setDbNotReady(false);

        const inc = await enrich((incRes.data || []) as Row[], "requester_id");
        const out = await enrich((outRes.data || []) as Row[], "target_id");
        setIncoming(inc);
        setOutgoing(out);
      } catch (e) {
        console.error("Compartilhamentos loadLists:", e);
        setMessage(
          e instanceof Error
            ? `Erro ao carregar: ${e.message}`
            : "Erro ao carregar solicitações. Atualize a página."
        );
      } finally {
        setListLoading(false);
      }
    },
    [loadMe]
  );

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  async function enviarSolicitacao() {
    setMessage("");
    const clean = email.trim().toLowerCase();
    if (!clean || !EMAIL_RE.test(clean)) {
      setMessage("Digite um email válido.");
      return;
    }
    if (!meId) {
      setMessage("Sessão inválida.");
      return;
    }

    setLoading(true);
    const { data: target, error: uErr } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", clean)
      .maybeSingle();

    if (uErr || !target) {
      setMessage("Não encontramos um usuário com este email.");
      setLoading(false);
      return;
    }

    if (target.id === meId) {
      setMessage("Você não pode solicitar acesso às próprias atividades.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("activity_share_requests").insert({
      requester_id: meId,
      target_id: target.id,
      status: "pending",
    });

    setLoading(false);

    if (error) {
      if (isActivityShareTableMissing(error.message)) {
        setDbNotReady(true);
        setMessage("");
        return;
      }
      if (error.code === "23505" || error.message.includes("duplicate")) {
        setMessage(
          "Já existe uma solicitação com este usuário. Aguarde resposta ou remova a solicitação anterior."
        );
      } else {
        setMessage(error.message);
      }
      return;
    }

    setEmail("");
    await loadLists({ preserveMessage: true });
    setMessage(
      "Solicitação enviada. O outro usuário pode aprovar em Compartilhamentos."
    );
  }

  async function responder(row: Row, status: "approved" | "rejected") {
    if (!meId) return;
    setLoading(true);
    const { error } = await supabase
      .from("activity_share_requests")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("target_id", meId);

    setLoading(false);
    if (error) {
      if (isActivityShareTableMissing(error.message)) setDbNotReady(true);
      setMessage(
        isActivityShareTableMissing(error.message) ? "" : error.message
      );
      return;
    }
    void loadLists();
  }

  async function removerSolicitacao(row: Row) {
    if (!meId || row.requester_id !== meId) return;
    setLoading(true);
    const { error } = await supabase
      .from("activity_share_requests")
      .delete()
      .eq("id", row.id)
      .eq("requester_id", meId);
    setLoading(false);
    if (error) {
      if (isActivityShareTableMissing(error.message)) setDbNotReady(true);
      setMessage(
        isActivityShareTableMissing(error.message) ? "" : error.message
      );
      return;
    }
    void loadLists();
  }

  const pendentesRecebidas = incoming.filter((r) => r.status === "pending");

  return (
    <div className="dark min-h-[100dvh] w-full bg-background text-foreground antialiased">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Voltar
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-primary hover:underline"
          >
            Ir ao dashboard
          </button>
        </div>

        <h1 className="mb-1 text-xl font-semibold">Compartilhar atividades</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Peça permissão para ver o calendário e atividades de um colega. Ele
          recebe a solicitação e pode aprovar ou recusar.
        </p>

        {dbNotReady ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
          >
            <p className="font-medium text-amber-50">
              Banco de dados: tabela ainda não criada
            </p>
            <p className="mt-2 text-xs leading-relaxed text-amber-200/90">
              No painel do Supabase, abra{" "}
              <strong className="text-amber-100">SQL Editor</strong>, cole e
              execute o script da migration{" "}
              <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">
                20250418000000_activity_share_requests.sql
              </code>{" "}
              (pasta <code className="rounded bg-black/30 px-1 text-[11px]">supabase/migrations</code>{" "}
              do projeto). Depois recarregue esta página.
            </p>
            <button
              type="button"
              onClick={() => void loadLists()}
              className="mt-3 rounded-lg border border-amber-600/60 bg-amber-900/40 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-900/60"
            >
              Tentar de novo
            </button>
          </div>
        ) : null}

        <section
          className={`mb-8 rounded-xl border border-border bg-card/60 p-4 shadow-sm ${dbNotReady ? "opacity-55" : ""}`}
        >
          <h2 className="mb-2 text-sm font-medium">Nova solicitação</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Informe o email cadastrado da pessoa cujas atividades você quer
            acompanhar.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              type="email"
              placeholder="email@empresa.com.br"
              value={email}
              disabled={dbNotReady || listLoading}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none ring-offset-background transition focus:border-primary/50 focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={loading || listLoading || dbNotReady}
              onClick={() => void enviarSolicitacao()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-red-600 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar
            </button>
          </div>
        </section>

        {message ? (
          <div
            role="status"
            className={`mb-4 flex gap-2 rounded-lg border px-3 py-2 text-sm ${
              message.includes("enviada") || message.includes("Solicitação")
                ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-200"
                : "border-red-800/60 bg-red-950/30 text-red-200"
            }`}
          >
            {!message.includes("enviada") && !message.includes("Solicitação") ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : null}
            <span>{message}</span>
          </div>
        ) : null}

        {listLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            {pendentesRecebidas.length > 0 ? (
              <section className="mb-8">
                <h2 className="mb-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Precisa da sua resposta ({pendentesRecebidas.length})
                </h2>
                <ul className="space-y-2">
                  {pendentesRecebidas.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-col gap-2 rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-medium">{r.otherNome}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.otherEmail}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Quer ver suas atividades
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => void responder(r, "approved")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Autorizar
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => void responder(r, "rejected")}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Recusar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="mb-8">
              <h2 className="mb-2 text-sm font-semibold">
                Solicitações que você enviou
              </h2>
              {outgoing.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {outgoing.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{r.otherNome}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {r.otherEmail}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                            r.status === "pending"
                              ? "bg-amber-900/60 text-amber-200"
                              : r.status === "approved"
                                ? "bg-emerald-900/60 text-emerald-200"
                                : "bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          {r.status === "pending"
                            ? "Pendente"
                            : r.status === "approved"
                              ? "Autorizado"
                              : "Recusado"}
                        </span>
                        {(r.status === "pending" || r.status === "rejected") ? (
                          <button
                            type="button"
                            className="text-xs text-red-400 hover:underline"
                            disabled={loading}
                            onClick={() => void removerSolicitacao(r)}
                          >
                            Remover
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold">
                Histórico — pedidos sobre você
              </h2>
              {incoming.filter((r) => r.status !== "pending").length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada aqui.</p>
              ) : (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {incoming
                    .filter((r) => r.status !== "pending")
                    .map((r) => (
                      <li key={r.id} className="rounded border border-border/60 px-3 py-2">
                        <span className="font-medium text-foreground">
                          {r.otherNome}
                        </span>{" "}
                        —{" "}
                        {r.status === "approved"
                          ? "Você autorizou o acesso."
                          : "Você recusou."}
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
