-- Adiciona coluna created_at na tabela users para monitorar datas de cadastro (pagamento a cada 30 dias)
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Atualiza registros existentes sem data (usa data atual como fallback)
UPDATE users SET created_at = NOW() WHERE created_at IS NULL;

-- Coluna ultimo_pagamento: ao clicar em PAGO, reinicia o ciclo de 30 dias
ALTER TABLE users ADD COLUMN IF NOT EXISTS ultimo_pagamento TIMESTAMPTZ;
