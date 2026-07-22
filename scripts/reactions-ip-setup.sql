-- Adicionar coluna ip_address na tabela reactions
ALTER TABLE reactions ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Índice para busca rápida por IP + post
CREATE INDEX IF NOT EXISTS idx_reactions_post_ip ON reactions (post_id, ip_address);

-- Remover RPC antigo se existir (vamos usar Edge Function agora)
-- Opcional: manter o RPC como fallback

-- Garantir que device_id + post_id seja único (cada device um voto)
-- Isso já deve ser tratado pela Edge Function, mas a constraint extra não faz mal
-- Nota: Se já houver duplicatas, essa constraint vai falhar. Verificar primeiro.
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_post_device ON reactions (post_id, device_id);
