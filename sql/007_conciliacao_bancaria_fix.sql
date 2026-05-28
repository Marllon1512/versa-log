-- BLOCO 6: Conciliação Bancária — versão segura (sem CHECK em tipo, sem FK em lancamento_id)
-- Execute este arquivo no Supabase Dashboard > SQL Editor

-- Tabela de extratos bancários (sem FK em importado_por para evitar dependência de usuarios)
CREATE TABLE IF NOT EXISTS extratos_bancarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID,
  banco TEXT NOT NULL,
  agencia TEXT,
  conta TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  saldo_inicial NUMERIC(15,2) DEFAULT 0,
  saldo_final NUMERIC(15,2) DEFAULT 0,
  importado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de transações do extrato (sem CHECK em tipo, sem FK em lancamento_id)
CREATE TABLE IF NOT EXISTS extrato_transacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extrato_id UUID REFERENCES extratos_bancarios(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  tipo TEXT NOT NULL,
  conciliado BOOLEAN DEFAULT FALSE,
  lancamento_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remover constraints problemáticas criadas pela versão anterior (004_conciliacao_bancaria.sql)
ALTER TABLE extrato_transacoes DROP CONSTRAINT IF EXISTS extrato_transacoes_tipo_check;
ALTER TABLE extrato_transacoes DROP CONSTRAINT IF EXISTS extrato_transacoes_lancamento_id_fkey;
ALTER TABLE extratos_bancarios DROP CONSTRAINT IF EXISTS extratos_bancarios_importado_por_fkey;

-- Garantir coluna lancamento_id como UUID simples (sem FK)
ALTER TABLE extrato_transacoes ADD COLUMN IF NOT EXISTS lancamento_id UUID;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_extratos_bancarios_loja ON extratos_bancarios(loja_id);
CREATE INDEX IF NOT EXISTS idx_extratos_bancarios_created ON extratos_bancarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extrato_transacoes_extrato ON extrato_transacoes(extrato_id);
CREATE INDEX IF NOT EXISTS idx_extrato_transacoes_data ON extrato_transacoes(data);
CREATE INDEX IF NOT EXISTS idx_extrato_transacoes_conciliado ON extrato_transacoes(conciliado);
