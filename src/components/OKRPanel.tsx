import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface OKRItem {
  id: string;
  objective: string;
  keyResults: string[];
  createdAt: string;
  completed: boolean;
  /** YYYY-MM-DD ou null */
  targetDate: string | null;
}

function formatTargetDateBR(iso: string | null): string | null {
  if (!iso || typeof iso !== "string") return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isTargetOverdue(iso: string | null, completed: boolean): boolean {
  if (!iso || completed) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return target < today;
}

type OKRPanelProps = {
  /** ID do usuário da página (rota /user/:userId). Se omitido, usa o usuário logado. */
  viewedUserId?: string;
  /** Nome para texto de “visualização” quando não pode editar */
  viewedUserName?: string;
};

export function OKRPanel({ viewedUserId, viewedUserName }: OKRPanelProps = {}) {
  const [objective, setObjective] = useState("");
  const [targetDateInput, setTargetDateInput] = useState("");
  const [keyResults, setKeyResults] = useState<string[]>([""]);
  const [okrs, setOkrs] = useState<OKRItem[]>([]);
  /** Dono dos OKRs na UI — sempre o id da tabela `users` (igual à rota /user/:id) */
  const [okrOwnerProfileId, setOkrOwnerProfileId] = useState<string | null>(
    null
  );
  /** Perfil do visitante (users.id), não confundir com auth.uid() se divergirem */
  const [viewerProfileId, setViewerProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const canEdit =
    Boolean(viewerProfileId) &&
    Boolean(okrOwnerProfileId) &&
    viewerProfileId === okrOwnerProfileId;

  useEffect(() => {
    loadOKRs();
  }, [viewedUserId]);

  async function loadOKRs() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      setMessage("Não foi possível identificar o usuário logado.");
      setLoading(false);
      return;
    }

    let myProfileId = user.id;
    if (user.email) {
      const { data: myRow } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      if (myRow?.id) myProfileId = myRow.id;
    }
    setViewerProfileId(myProfileId);

    const ownerProfileId = viewedUserId?.trim() || myProfileId;
    setOkrOwnerProfileId(ownerProfileId);

    const userIdCandidates = Array.from(
      new Set(
        ownerProfileId === myProfileId
          ? [ownerProfileId, user.id]
          : [ownerProfileId]
      )
    );

    const { data, error } = await supabase
      .from("okrs")
      .select("id, objective, key_results, created_at, completed, target_date")
      .in("user_id", userIdCandidates)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Erro ao carregar OKRs. Verifique se a tabela okrs existe no Supabase.");
      setLoading(false);
      return;
    }

    const mapped: OKRItem[] = (data || []).map((item: any) => ({
      id: item.id,
      objective: item.objective || "",
      keyResults: Array.isArray(item.key_results) ? item.key_results : [],
      createdAt: item.created_at || "",
      completed: Boolean(item.completed),
      targetDate:
        item.target_date != null && item.target_date !== ""
          ? String(item.target_date).slice(0, 10)
          : null,
    }));

    setOkrs(mapped);
    setLoading(false);
  }

  function updateKeyResult(index: number, value: string) {
    setKeyResults((prev) => prev.map((kr, i) => (i === index ? value : kr)));
  }

  function addKeyResultField() {
    setKeyResults((prev) => [...prev, ""]);
  }

  function removeKeyResultField(index: number) {
    setKeyResults((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveOKR() {
    setMessage("");

    const cleanObjective = objective.trim();
    const cleanKeyResults = keyResults.map((k) => k.trim()).filter(Boolean);

    if (!cleanObjective || cleanKeyResults.length === 0) {
      alert("Preencha o objetivo e pelo menos 1 resultado-chave.");
      return;
    }

    if (!okrOwnerProfileId || !canEdit) {
      setMessage("Usuário não identificado para salvar OKR.");
      return;
    }

    setSaving(true);

    const targetDate =
      targetDateInput.trim() !== "" ? targetDateInput.trim() : null;

    const { data, error } = await supabase
      .from("okrs")
      .insert({
        user_id: okrOwnerProfileId,
        objective: cleanObjective,
        key_results: cleanKeyResults,
        completed: false,
        target_date: targetDate,
      })
      .select("id, objective, key_results, created_at, completed, target_date")
      .single();

    if (error || !data) {
      setMessage("Erro ao salvar OKR no Supabase.");
      setSaving(false);
      return;
    }

    const row = data as {
      id: string;
      objective?: string;
      key_results?: string[];
      created_at?: string;
      completed?: boolean;
      target_date?: string | null;
    };

    const item: OKRItem = {
      id: row.id,
      objective: row.objective || "",
      keyResults: Array.isArray(row.key_results) ? row.key_results : [],
      createdAt: row.created_at || "",
      completed: Boolean(row.completed),
      targetDate:
        row.target_date != null && row.target_date !== ""
          ? String(row.target_date).slice(0, 10)
          : null,
    };

    setOkrs((prev) => [item, ...prev]);
    setObjective("");
    setTargetDateInput("");
    setKeyResults([""]);
    setSaving(false);
  }

  async function removeOKR(id: string) {
    setMessage("");

    const { error } = await supabase
      .from("okrs")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("Erro ao excluir OKR.");
      return;
    }

    setOkrs((prev) => prev.filter((okr) => okr.id !== id));
  }

  async function setOKRCompleted(id: string, completed: boolean) {
    setMessage("");
    setToggleBusyId(id);

    const { error } = await supabase
      .from("okrs")
      .update({ completed })
      .eq("id", id);

    if (error) {
      setMessage(
        "Erro ao atualizar status do OKR. Verifique se a coluna completed existe no Supabase."
      );
      setToggleBusyId(null);
      return;
    }

    setOkrs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, completed } : o))
    );
    setToggleBusyId(null);
  }

  return (
    <div className="space-y-4 transition-all duration-300">
      {message ? (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300">
          {message}
        </div>
      ) : null}

      {!loading &&
      viewerProfileId &&
      okrOwnerProfileId &&
      viewerProfileId !== okrOwnerProfileId ? (
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:text-zinc-400">
          Visualização dos OKRs
          {viewedUserName ? (
            <>
              {" "}
              de <span className="font-medium text-foreground dark:text-zinc-200">{viewedUserName}</span>
            </>
          ) : null}
          . Apenas o próprio usuário pode criar ou alterar OKRs aqui.
        </div>
      ) : null}

      {canEdit ? (
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3">
        <h3 className="text-base sm:text-lg font-semibold">🎯 Planejamento de OKRs</h3>

        <input
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Objective (ex: Aumentar eficiência operacional)"
          className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-base sm:text-sm"
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground">
            Prazo para atingir a meta
          </label>
          <input
            type="date"
            value={targetDateInput}
            onChange={(e) => setTargetDateInput(e.target.value)}
            className="w-full sm:max-w-[240px] min-h-[44px] px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-base sm:text-sm [color-scheme:dark]"
          />
          <p className="text-[11px] text-muted-foreground/90">
            Opcional. Ajuda a lembrar até quando o objetivo deve ser concluído.
          </p>
        </div>

        <div className="space-y-2">
          {keyResults.map((kr, index) => (
            <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                value={kr}
                onChange={(e) => updateKeyResult(index, e.target.value)}
                placeholder={`Resultado-chave ${index + 1}`}
                className="flex-1 min-h-[44px] px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-base sm:text-sm"
              />
              <button
                type="button"
                onClick={() => removeKeyResultField(index)}
                disabled={keyResults.length === 1}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-border text-sm disabled:opacity-50 active:scale-[0.98] transition shrink-0"
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={addKeyResultField}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-muted text-sm font-medium active:scale-[0.98] transition"
          >
            + Adicionar KR
          </button>
          <button
            type="button"
            onClick={saveOKR}
            disabled={saving}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-60 active:scale-[0.98] transition"
          >
            {saving ? "Salvando..." : "Salvar OKR"}
          </button>
        </div>
      </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-2 md:pb-0">
        {loading && (
          <div className="text-sm text-muted-foreground">
            Carregando OKRs...
          </div>
        )}

        {!loading && okrs.length === 0 ? (
          <div className="text-sm text-muted-foreground lg:col-span-2">
            Nenhum OKR cadastrado
            {viewedUserName && !canEdit ? ` para ${viewedUserName}` : ""}.
          </div>
        ) : null}

        {okrs.map((okr) => (
          <div
            key={okr.id}
            className={`rounded-xl p-3 sm:p-4 space-y-3 border transition-colors ${
              okr.completed
                ? "bg-emerald-950/35 border-emerald-500/60 ring-1 ring-emerald-500/25"
                : "bg-card border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {okr.completed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-400 mb-1.5">
                    ✓ OKR concluído
                  </span>
                ) : null}
                <h4
                  className={`font-semibold text-sm sm:text-base leading-snug pr-2 ${
                    okr.completed ? "text-emerald-50" : ""
                  }`}
                >
                  {okr.objective}
                </h4>
                {okr.targetDate ? (
                  <p
                    className={`mt-1.5 text-xs ${
                      okr.completed
                        ? "text-emerald-300/90"
                        : isTargetOverdue(okr.targetDate, okr.completed)
                          ? "text-amber-400 font-medium"
                          : "text-muted-foreground"
                    }`}
                  >
                    📅 Meta até{" "}
                    <span className="tabular-nums">
                      {formatTargetDateBR(okr.targetDate)}
                    </span>
                    {!okr.completed &&
                    isTargetOverdue(okr.targetDate, okr.completed) ? (
                      <span className="ml-1.5 text-amber-500">
                        (prazo vencido)
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => removeOKR(okr.id)}
                  className="min-h-[36px] min-w-[36px] shrink-0 text-xs text-red-400 hover:text-red-300 px-2 rounded-lg active:bg-red-500/10"
                >
                  Excluir
                </button>
              ) : null}
            </div>

            <ul
              className={`space-y-1 text-sm ${
                okr.completed ? "text-emerald-100/85" : "text-muted-foreground"
              }`}
            >
              {okr.keyResults.map((kr, index) => (
                <li key={index}>• {kr}</li>
              ))}
            </ul>

            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {!okr.completed ? (
                  <button
                    type="button"
                    disabled={toggleBusyId === okr.id}
                    onClick={() => setOKRCompleted(okr.id, true)}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm shadow-emerald-900/40 disabled:opacity-60 active:scale-[0.98] transition"
                  >
                    {toggleBusyId === okr.id ? "Salvando..." : "OKR concluído"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={toggleBusyId === okr.id}
                    onClick={() => setOKRCompleted(okr.id, false)}
                    className="min-h-[40px] px-4 py-2 rounded-xl border border-emerald-500/50 bg-emerald-950/40 text-emerald-200 text-sm font-medium hover:bg-emerald-900/50 disabled:opacity-60 active:scale-[0.98] transition"
                  >
                    {toggleBusyId === okr.id ? "Salvando..." : "Reabrir OKR"}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
