-- Data limite para atingir o objetivo do OKR
alter table public.okrs
  add column if not exists target_date date;

comment on column public.okrs.target_date is 'Prazo planejado para conclusão da meta (somente data)';
