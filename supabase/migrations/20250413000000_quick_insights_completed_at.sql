-- Marcar insight como concluído; limpeza remove linhas concluídas há mais de 24h (via app ou job)

alter table public.quick_insights
  add column if not exists completed_at timestamptz null;

comment on column public.quick_insights.completed_at is 'Quando preenchido, o cartão some do banco 24h após essa data (limpeza no cliente).';
