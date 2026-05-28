-- BLOCO 6: Logo de lojas e logo principal Versa
-- Execute este arquivo no Supabase Dashboard > SQL Editor

ALTER TABLE lojas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS logo_versa_url TEXT;
