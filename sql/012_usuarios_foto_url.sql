-- 012: Adiciona coluna foto_url nas tabelas usuarios e funcionarios
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE usuarios     ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS foto_url TEXT;
