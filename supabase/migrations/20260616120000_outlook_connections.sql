-- Conexões com o calendário do Outlook (Microsoft Graph).
-- Guarda o refresh_token de cada usuário para permitir a sincronização automática.
-- Somente o backend (SERVICE_ROLE_KEY) acessa esta tabela.

create table if not exists public.outlook_connections (
  user_id          uuid primary key,            -- id na tabela public.users (mesmo usado em atividades.user_id)
  ms_email         text,
  refresh_token    text not null,
  access_token     text,
  token_expires_at timestamptz,
  connected_at     timestamptz not null default now(),
  last_synced_at   timestamptz,
  updated_at       timestamptz not null default now()
);

-- RLS habilitado SEM policies = nenhuma role pública (anon/authenticated) consegue ler/escrever.
-- O backend usa a SERVICE_ROLE_KEY, que ignora o RLS — então só o servidor toca nesses tokens.
alter table public.outlook_connections enable row level security;
