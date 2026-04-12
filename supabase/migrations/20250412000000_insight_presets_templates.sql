-- Presets de tags e modelos de texto rápidos (editáveis por usuário)

create table if not exists public.quick_insight_tag_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  label text not null,
  emoji text not null default '💬',
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists quick_insight_tag_presets_user_pos_idx
  on public.quick_insight_tag_presets (user_id, position);

comment on table public.quick_insight_tag_presets is 'Tags exibidas nos insights rápidos (personalizáveis)';

alter table public.quick_insight_tag_presets enable row level security;

create policy "insight_tag_presets_select_own"
  on public.quick_insight_tag_presets for select to authenticated
  using (auth.uid() = user_id);

create policy "insight_tag_presets_insert_own"
  on public.quick_insight_tag_presets for insert to authenticated
  with check (auth.uid() = user_id);

create policy "insight_tag_presets_update_own"
  on public.quick_insight_tag_presets for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "insight_tag_presets_delete_own"
  on public.quick_insight_tag_presets for delete to authenticated
  using (auth.uid() = user_id);

-- Modelos + prefixo (ex.: "Lembrete" → "Lembrete: ")

create table if not exists public.quick_insight_text_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  prefix text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quick_insight_text_templates_user_pos_idx
  on public.quick_insight_text_templates (user_id, position);

comment on table public.quick_insight_text_templates is 'Atalhos de texto para o campo de insight';

alter table public.quick_insight_text_templates enable row level security;

create policy "insight_text_templates_select_own"
  on public.quick_insight_text_templates for select to authenticated
  using (auth.uid() = user_id);

create policy "insight_text_templates_insert_own"
  on public.quick_insight_text_templates for insert to authenticated
  with check (auth.uid() = user_id);

create policy "insight_text_templates_update_own"
  on public.quick_insight_text_templates for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "insight_text_templates_delete_own"
  on public.quick_insight_text_templates for delete to authenticated
  using (auth.uid() = user_id);
