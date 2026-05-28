-- BLOCO 4: Conciliação Bancária
-- Execute este arquivo no Supabase Dashboard > SQL Editor

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
  importado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS extrato_transacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extrato_id UUID REFERENCES extratos_bancarios(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito','debito')),
  conciliado BOOLEAN DEFAULT FALSE,
  lancamento_id UUID REFERENCES financeiro_lancamentos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
