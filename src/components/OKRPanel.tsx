import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface OKRItem {
  id: string;
  objective: string;
  keyResults: string[];
  createdAt: string;
  completed: boolean;
}

export function OKRPanel() {
  const [objective, setObjective] = useState("");
  const [keyResults, setKeyResults] = useState<string[]>([""]);
  const [okrs, setOkrs] = useState<OKRItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadOKRs();
  }, []);

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

    // Usar o id do Auth diretamente evita depender da tabela `users`
    // (e possíveis bloqueios/ RLS nela).
    setUserId(user.id);

    const { data, error } = await supabase
      .from("okrs")
      .select("id, objective, key_results, created_at, completed")
      .eq("user_id", user.id)
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

    if (!userId) {
      setMessage("Usuário não identificado para salvar OKR.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("okrs")
      .insert({
        user_id: userId,
        objective: cleanObjective,
        key_results: cleanKeyResults,
        completed: false,
      })
      .select("id, objective, key_results, created_at, completed")
      .single();

    if (error || !data) {
      setMessage("Erro ao salvar OKR no Supabase.");
      setSaving(false);
      return;
    }

    const item: OKRItem = {
      id: data.id,
      objective: data.objective || "",
      keyResults: Array.isArray(data.key_results) ? data.key_results : [],
      createdAt: data.created_at || "",
      completed: Boolean((data as { completed?: boolean }).completed),
    };

    setOkrs((prev) => [item, ...prev]);
    setObjective("");
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
        <div className="rounded border border-red-700 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {message}
        </div>
      ) : null}

      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3">
        <h3 className="text-base sm:text-lg font-semibold">🎯 Planejamento de OKRs</h3>

        <input
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Objective (ex: Aumentar eficiência operacional)"
          className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-base sm:text-sm"
        />

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-2 md:pb-0">
        {loading && (
          <div className="text-sm text-muted-foreground">
            Carregando OKRs...
          </div>
        )}

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
              </div>
              <button
                type="button"
                onClick={() => removeOKR(okr.id)}
                className="min-h-[36px] min-w-[36px] shrink-0 text-xs text-red-400 hover:text-red-300 px-2 rounded-lg active:bg-red-500/10"
              >
                Excluir
              </button>
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
          </div>
        ))}
      </div>
    </div>
  );
}
