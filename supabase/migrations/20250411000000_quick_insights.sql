-- Insights rápidos: anotações por usuário autenticado (RLS com auth.uid())

create table if not exists public.quick_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  tags text[] not null default '{}',
  context_label text not null default '',
  route text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quick_insights_user_created_idx
  on public.quick_insights (user_id, pinned desc, created_at desc);

comment on table public.quick_insights is 'Anotações rápidas (insights) por usuário';

alter table public.quick_insights enable row level security;

create policy "quick_insights_select_own"
  on public.quick_insights
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "quick_insights_insert_own"
  on public.quick_insights
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "quick_insights_update_own"
  on public.quick_insights
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "quick_insights_delete_own"
  on public.quick_insights
  for delete
  to authenticated
  using (auth.uid() = user_id);
