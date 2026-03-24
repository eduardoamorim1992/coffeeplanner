-- Marca OKR como concluído (UI verde + botão)
alter table public.okrs
  add column if not exists completed boolean not null default false;

comment on column public.okrs.completed is 'true quando o usuário marca o OKR como concluído';
