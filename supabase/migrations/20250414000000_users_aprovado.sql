-- Cadastro self-service: fica inativo até o admin aprovar (aprovado = true).
-- Valor padrão true mantém usuários já existentes e os criados pelo painel admin.
ALTER TABLE users ADD COLUMN IF NOT EXISTS aprovado BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE users SET aprovado = TRUE WHERE aprovado IS NULL;

COMMENT ON COLUMN users.aprovado IS 'false = cadastro público aguardando aprovação do administrador.';
