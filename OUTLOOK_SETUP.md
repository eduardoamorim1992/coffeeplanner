# Integração com o Outlook (Microsoft Graph)

Substitui a antiga importação por link ICS. O usuário conecta a conta da Microsoft
**uma vez** e os compromissos da agenda do Outlook entram automaticamente como atividades.

## Como funciona
1. Na tela do calendário aparece o botão **"Conectar Outlook"**.
2. O usuário faz login na Microsoft e autoriza o acesso à agenda (somente leitura).
3. Ao voltar, o app sincroniza sozinho os próximos 90 dias.
4. Depois, o botão vira **"Sincronizar Outlook"** (e também sincroniza ao abrir a tela).
5. As atividades importadas aparecem com o prefixo **`[Outlook]`** no título.

## Passos para colocar no ar

### 1. Rodar a migração no Supabase
No painel do Supabase → **SQL Editor**, cole e execute o conteúdo de:
`supabase/migrations/20260616120000_outlook_connections.sql`

Isso cria a tabela `outlook_connections` (protegida por RLS — só o backend acessa).

### 2. Configurar as variáveis de ambiente na Vercel
Em **Vercel → Project → Settings → Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `MS_CLIENT_ID` | `d05ca323-5d2b-4be4-85d6-e6bb3589522a` |
| `MS_TENANT_ID` | `e2c7697c-ee69-4708-9955-53f7fbca5e49` |
| `MS_CLIENT_SECRET` | *(o "Valor" do segredo criado no Azure)* |
| `MS_REDIRECT_URI` | `https://coffeplanner.online/api/outlook/callback` |
| `APP_BASE_URL` | `https://coffeplanner.online` |

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` provavelmente já existem (usadas por outras funções).
> `OUTLOOK_STATE_SECRET` é opcional — se não definir, o backend reutiliza a service role key.

### 3. Conferir o registro no Azure (Microsoft Entra ID → App: CoffePlanner)
- **URI de redirecionamento (Web):** `https://coffeplanner.online/api/outlook/callback`
- **Permissões de API (Microsoft Graph, delegadas):** `Calendars.Read`, `offline_access`
- **Segredo do cliente:** criado em *Certificados e segredos* (anote a data de expiração).

### 4. Fazer o deploy
Após `git push`, a Vercel publica as funções em `api/outlook/*`.

## Endpoints criados (todos exigem login, exceto o callback)
- `GET  /api/outlook/auth-url` — devolve a URL de login da Microsoft.
- `GET  /api/outlook/callback` — recebe o retorno da Microsoft e salva a conexão.
- `POST /api/outlook/sync` — importa os compromissos (próximos 90 dias).
- `GET  /api/outlook/status` — informa se está conectado.
- `POST /api/outlook/disconnect` — remove a conexão.

## Observações de segurança
- O `refresh_token` fica só no servidor (tabela com RLS, acessível apenas pela service role).
- O `state` do OAuth é assinado (HMAC) para evitar CSRF.
- O login é restrito ao tenant da empresa (`MS_TENANT_ID`).
