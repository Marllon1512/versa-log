-- BLOCO 1: Fluxo completo de pedidos
-- Execute este arquivo no Supabase Dashboard > SQL Editor

-- 1. Novas colunas na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS status_fluxo TEXT DEFAULT 'rascunho';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS aprovado_gerente_por UUID REFERENCES usuarios(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS aprovado_gerente_em TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS rejeitado_gerente_motivo TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS aprovado_financeiro_por UUID REFERENCES usuarios(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS aprovado_financeiro_em TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS rejeitado_financeiro_motivo TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS confirmado_fabrica_em TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS confirmado_fabrica_doc TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS data_entrega_agendada DATE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS agendado_por UUID REFERENCES usuarios(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS agendado_em TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS anexos TEXT[] DEFAULT '{}';

-- 2. Timeline de eventos do pedido
CREATE TABLE IF NOT EXISTS pedidos_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  usuario_nome TEXT,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  anexos TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Follow-up / comentários internos do pedido
CREATE TABLE IF NOT EXISTS pedidos_followup (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  usuario_nome TEXT,
  texto TEXT NOT NULL,
  anexos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bucket de storage (criar manualmente no Supabase Dashboard > Storage)
-- Nome: pedidos-anexos | Acesso: público
