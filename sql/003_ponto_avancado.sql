-- BLOCO 3: Ponto eletrônico avançado
-- Execute este arquivo no Supabase Dashboard > SQL Editor

-- 1. Colunas adicionais na tabela pontos
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS endereco_aproximado TEXT;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS dentro_cerca BOOLEAN DEFAULT TRUE;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS distancia_loja_metros INTEGER;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS tipo_marcacao TEXT DEFAULT 'entrada';
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS justificativa TEXT;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS justificativa_aprovada BOOLEAN;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS justificativa_aprovada_por UUID REFERENCES usuarios(id);
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS device_info TEXT;

-- 2. Escalas de trabalho por funcionário
CREATE TABLE IF NOT EXISTS escalas_trabalho (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  loja_id UUID REFERENCES lojas(id),
  dia_semana INTEGER,
  hora_entrada TIME NOT NULL,
  hora_saida_almoco TIME,
  hora_retorno_almoco TIME,
  hora_saida TIME NOT NULL,
  tolerancia_minutos INTEGER DEFAULT 10,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- dia_semana: 0=domingo, 1=segunda, ..., 6=sábado. NULL = escala padrão (todos os dias)

-- 3. Ocorrências de ponto para análise do DP
CREATE TABLE IF NOT EXISTS ponto_ocorrencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  loja_id UUID REFERENCES lojas(id),
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  minutos INTEGER,
  justificativa TEXT,
  status TEXT DEFAULT 'pendente',
  aprovado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- tipos: atraso, saida_antecipada, falta, hora_extra, esquecimento_ponto, marcacao_fora_cerca

-- 4. Cercas virtuais por loja
CREATE TABLE IF NOT EXISTS cercas_virtuais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  raio_metros INTEGER DEFAULT 200,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
