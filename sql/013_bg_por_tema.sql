-- 013: Adiciona colunas de imagem de fundo separadas por tema
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_clara_1  TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_clara_2  TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_escura_1 TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_escura_2 TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_ativa_clara     TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_ativa_escura    TEXT;
