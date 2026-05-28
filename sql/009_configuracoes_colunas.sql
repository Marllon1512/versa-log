-- 009: Adiciona colunas de aparência e logo na tabela real "configuracoes"
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_1           TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_2           TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_3           TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_ativa       TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_blur_intensidade   INTEGER DEFAULT 8;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_overlay_opacidade  INTEGER DEFAULT 40;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS logo_versa_url        TEXT;
