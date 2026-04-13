-- Coluna opcional espelhando o UUID do Auth (alguns projetos usam para integrações).
-- O app preenche auth_id = id nos cadastros; linhas antigas recebem id.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID;

UPDATE users SET auth_id = id WHERE auth_id IS NULL;
