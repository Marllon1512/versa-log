-- 011: Garante estrutura completa da tabela configuracoes + registro singleton
-- Execute no Supabase Dashboard > SQL Editor

-- Garantir que a tabela existe com id UUID
CREATE TABLE IF NOT EXISTS configuracoes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bg_imagem_1          TEXT,
  bg_imagem_2          TEXT,
  bg_imagem_3          TEXT,
  bg_imagem_ativa      TEXT,
  bg_blur_intensidade  INTEGER DEFAULT 8,
  bg_overlay_opacidade INTEGER DEFAULT 40,
  logo_versa_url       TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas caso a tabela já exista sem elas
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_1          TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_2          TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_3          TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_ativa      TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_blur_intensidade  INTEGER DEFAULT 8;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_overlay_opacidade INTEGER DEFAULT 40;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS logo_versa_url       TEXT;

-- Inserir registro singleton com ID fixo (ignorado se já existir)
INSERT INTO configuracoes (id, bg_blur_intensidade, bg_overlay_opacidade)
VALUES ('00000000-0000-0000-0000-000000000001', 8, 40)
ON CONFLICT (id) DO NOTHING;
