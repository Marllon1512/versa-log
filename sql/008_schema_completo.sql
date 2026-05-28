-- ============================================================
-- 008: SCHEMA COMPLETO — Migration segura
-- Gerado a partir de análise de src/services/index.js,
-- src/services/pedidos.js e src/App.jsx
-- ============================================================
-- REGRAS:
--   • CREATE TABLE IF NOT EXISTS     → seguro para re-execução
--   • ALTER TABLE ADD COLUMN IF NOT EXISTS → seguro
--   • SEM DROP TABLE / SEM DROP COLUMN
--   • FKs apenas em relações pai-filho diretas e seguras
--   • Sequences com IF NOT EXISTS
-- ============================================================
-- ORDEM DE EXECUÇÃO RECOMENDADA:
--   1. Execute este arquivo inteiro de uma vez no SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. LOJAS  (base de tudo — sem dependências)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lojas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        TEXT NOT NULL,
  endereco    TEXT,
  telefone    TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lojas_nome ON lojas(nome);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS logo_url   TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS endereco   TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS telefone   TEXT;

-- ─────────────────────────────────────────────────────────
-- 2. USUÁRIOS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name           TEXT,
  email               TEXT,
  role                TEXT DEFAULT 'vendedor',
  perfil              TEXT DEFAULT 'vendedor',
  loja                TEXT,
  loja_id             UUID,
  permissoes_extras   JSONB DEFAULT '{}',
  ativo               BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email) WHERE email IS NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil            TEXT DEFAULT 'vendedor';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS loja              TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS loja_id          UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permissoes_extras JSONB DEFAULT '{}';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo             BOOLEAN DEFAULT TRUE;

-- ─────────────────────────────────────────────────────────
-- 3. PERFIS DE ACESSO
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfis_acesso (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  perfil                  TEXT NOT NULL UNIQUE,
  label                   TEXT NOT NULL,
  modulos                 TEXT[] NOT NULL DEFAULT '{}',
  pode_ver_todas_lojas    BOOLEAN DEFAULT FALSE,
  pode_ver_financeiro     BOOLEAN DEFAULT FALSE,
  pode_ver_vendas         BOOLEAN DEFAULT FALSE,
  pode_ver_metas          BOOLEAN DEFAULT FALSE,
  pode_editar_permissoes  BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO perfis_acesso (perfil,label,modulos,pode_ver_todas_lojas,pode_ver_financeiro,pode_ver_vendas,pode_ver_metas,pode_editar_permissoes) VALUES
('admin','Administrador',ARRAY['dashboard','pedidos','separacao','agenda','assistencia','roteiro','conferencia','equipe','ranking','mapa','rota','ponto','config','cadastros','vendas','compras','estoque','financeiro','dp','os','crm','nps','devolucao','relatorios','fila','catalogo','nf'],true,true,true,true,true),
('gestor','Gestor',ARRAY['dashboard','pedidos','separacao','agenda','assistencia','roteiro','conferencia','equipe','ranking','mapa','rota','ponto','config','cadastros','vendas','compras','estoque','financeiro','dp','os','crm','nps','devolucao','relatorios','fila','catalogo','nf'],true,true,true,true,true),
('diretor','Diretor',ARRAY['dashboard','pedidos','separacao','agenda','assistencia','roteiro','conferencia','equipe','ranking','mapa','rota','ponto','cadastros','vendas','compras','estoque','financeiro','dp','os','crm','nps','devolucao','relatorios','fila'],true,true,true,true,false),
('gerente','Gerente de Loja',ARRAY['dashboard','pedidos','agenda','assistencia','conferencia','equipe','ranking','ponto','cadastros','vendas','estoque','os','crm','nps'],false,false,true,true,false),
('assistente_admin','Assistente Administrativa',ARRAY['dashboard','pedidos','agenda','ponto','cadastros','compras','estoque','dp','financeiro_loja'],false,false,false,false,false),
('vendedor','Vendedor',ARRAY['dashboard','vendas','cadastros','ponto','crm','ranking'],false,false,true,true,false),
('gerente_logistica','Gerente de Logística',ARRAY['dashboard','pedidos','separacao','roteiro','conferencia','assistencia','mapa','rota','ponto','estoque','equipe','ranking'],true,false,false,false,false),
('supervisor_logistica','Supervisor de Logística',ARRAY['dashboard','pedidos','separacao','roteiro','conferencia','assistencia','mapa','rota','ponto','estoque'],true,false,false,false,false),
('expedidor','Expedição',ARRAY['dashboard','separacao','conferencia','ponto'],false,false,false,false,false),
('entregador','Entregador',ARRAY['dashboard','rota','pedidos','ponto','ranking'],false,false,false,false,false),
('motorista','Motorista',ARRAY['dashboard','rota','pedidos','ponto','ranking'],false,false,false,false,false),
('separador','Separador',ARRAY['dashboard','separacao','pedidos','ponto'],false,false,false,false,false),
('conferente','Conferente',ARRAY['dashboard','conferencia','pedidos','ponto'],false,false,false,false,false),
('tecnico','Técnico',ARRAY['dashboard','assistencia','roteiro','ponto'],false,false,false,false,false),
('atendente','Atendente',ARRAY['dashboard','assistencia','pedidos','agenda','ponto'],false,false,false,false,false),
('contador','Contador',ARRAY['financeiro','dp','relatorios'],true,true,false,false,false)
ON CONFLICT (perfil) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 4. CONFIGURAÇÕES DO SISTEMA
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracoes (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bg_imagem_1             TEXT,
  bg_imagem_2             TEXT,
  bg_imagem_3             TEXT,
  bg_imagem_ativa         TEXT,
  bg_blur_intensidade     INTEGER DEFAULT 8,
  bg_overlay_opacidade    INTEGER DEFAULT 40,
  logo_versa_url          TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_1           TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_2           TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_3           TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_imagem_ativa       TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_blur_intensidade   INTEGER DEFAULT 8;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS bg_overlay_opacidade  INTEGER DEFAULT 40;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS logo_versa_url        TEXT;

-- ─────────────────────────────────────────────────────────
-- 5. CLIENTES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        TEXT NOT NULL,
  telefone    TEXT,
  email       TEXT,
  cpf         TEXT,
  cnpj        TEXT,
  endereco    TEXT,
  cidade      TEXT,
  bairro      TEXT,
  cep         TEXT,
  observacoes TEXT,
  loja        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);

-- ─────────────────────────────────────────────────────────
-- 6. FORNECEDORES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fornecedores (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        TEXT NOT NULL,
  cnpj        TEXT,
  telefone    TEXT,
  email       TEXT,
  contato     TEXT,
  endereco    TEXT,
  cidade      TEXT,
  observacoes TEXT,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome ON fornecedores(nome);

-- ─────────────────────────────────────────────────────────
-- 7. PEDIDOS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido               INTEGER,
  cliente                     TEXT NOT NULL,
  telefone                    TEXT,
  endereco                    TEXT,
  cidade                      TEXT DEFAULT 'Belo Horizonte',
  data_entrega                DATE,
  prioridade                  TEXT DEFAULT 'Normal',
  observacoes                 TEXT,
  local_separacao             TEXT,
  status                      TEXT DEFAULT 'Pendente',
  requer_montagem             BOOLEAN DEFAULT FALSE,
  entregador_id               UUID,
  entregador_nome             TEXT,
  motivo_remarcacao           TEXT,
  motivo_cancelamento         TEXT,
  loja                        TEXT,
  vendedor_id                 UUID,
  status_fluxo                TEXT DEFAULT 'rascunho',
  aprovado_gerente_por        UUID,
  aprovado_gerente_em         TIMESTAMPTZ,
  rejeitado_gerente_motivo    TEXT,
  aprovado_financeiro_por     UUID,
  aprovado_financeiro_em      TIMESTAMPTZ,
  rejeitado_financeiro_motivo TEXT,
  confirmado_fabrica_em       TIMESTAMPTZ,
  confirmado_fabrica_doc      TEXT,
  data_entrega_agendada       DATE,
  agendado_por                UUID,
  agendado_em                 TIMESTAMPTZ,
  anexos                      TEXT[] DEFAULT '{}',
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);
-- Adicionar colunas em pedidos já existentes
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero_pedido               INTEGER;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS status_fluxo                TEXT DEFAULT 'rascunho';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS aprovado_gerente_por        UUID;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS aprovado_gerente_em         TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS rejeitado_gerente_motivo    TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS aprovado_financeiro_por     UUID;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS aprovado_financeiro_em      TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS rejeitado_financeiro_motivo TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS confirmado_fabrica_em       TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS confirmado_fabrica_doc      TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS data_entrega_agendada       DATE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS agendado_por                UUID;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS agendado_em                 TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS anexos                      TEXT[] DEFAULT '{}';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS updated_at                  TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS loja                        TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS vendedor_id                 UUID;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entregador_id               UUID;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entregador_nome             TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_remarcacao           TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_cancelamento         TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS requer_montagem             BOOLEAN DEFAULT FALSE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cidade                      TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS telefone                    TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS prioridade                  TEXT DEFAULT 'Normal';
CREATE INDEX IF NOT EXISTS idx_pedidos_status        ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_status_fluxo  ON pedidos(status_fluxo);
CREATE INDEX IF NOT EXISTS idx_pedidos_loja          ON pedidos(loja);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_entrega  ON pedidos(data_entrega);
CREATE INDEX IF NOT EXISTS idx_pedidos_created       ON pedidos(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 8. PRODUTOS (itens do pedido)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produtos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id        UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  nome_produto     TEXT,
  quantidade       INTEGER DEFAULT 1,
  acabamento       TEXT,
  medida           TEXT,
  observacao       TEXT,
  status_produto   TEXT DEFAULT 'Pendente',
  volumes          INTEGER,
  local_separacao  TEXT,
  nivel_peso       TEXT,
  foto_separacao   TEXT,
  referencia       TEXT,
  codigo_barras    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_produtos_pedido_id ON produtos(pedido_id);

-- ─────────────────────────────────────────────────────────
-- 9. CATÁLOGO DE PRODUTOS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalogo_produtos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome            TEXT NOT NULL,
  tipo            TEXT DEFAULT 'produto',
  referencia      TEXT,
  preco_custo     NUMERIC(12,2) DEFAULT 0,
  preco_venda     NUMERIC(12,2) DEFAULT 0,
  unidade         TEXT DEFAULT 'un',
  estoque_atual   INTEGER DEFAULT 0,
  estoque_minimo  INTEGER DEFAULT 0,
  descricao       TEXT,
  fotos           TEXT[] DEFAULT '{}',
  loja            TEXT,
  codigo_produto  INTEGER,
  codigo_barras   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_catalogo_nome ON catalogo_produtos(nome);
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS codigo_produto INTEGER;
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS codigo_barras  TEXT;
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS fotos          TEXT[] DEFAULT '{}';
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS estoque_atual  INTEGER DEFAULT 0;
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;

-- ─────────────────────────────────────────────────────────
-- 10. ESTOQUE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estoque (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_produto    TEXT NOT NULL,
  loja            TEXT,
  quantidade      INTEGER DEFAULT 0,
  estoque_atual   INTEGER DEFAULT 0,
  estoque_minimo  INTEGER DEFAULT 0,
  unidade         TEXT DEFAULT 'un',
  referencia      TEXT,
  sku             TEXT,
  codigo_barras   TEXT,
  preco_venda     NUMERIC(12,2),
  preco_custo     NUMERIC(12,2),
  catalogo_id     UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_estoque_loja ON estoque(loja);
CREATE INDEX IF NOT EXISTS idx_estoque_nome ON estoque(nome_produto);

-- ─────────────────────────────────────────────────────────
-- 11. MOVIMENTOS DE ESTOQUE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimentos_estoque (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo            TEXT NOT NULL,
  produto_nome    TEXT,
  catalogo_id     UUID,
  quantidade      INTEGER NOT NULL,
  loja            TEXT,
  origem          TEXT,
  referencia_id   UUID,
  fornecedor_nome TEXT,
  registrado_por  TEXT,
  data            DATE,
  descricao       TEXT,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movimentos_estoque_created ON movimentos_estoque(created_at DESC);
ALTER TABLE movimentos_estoque ADD COLUMN IF NOT EXISTS catalogo_id    UUID;
ALTER TABLE movimentos_estoque ADD COLUMN IF NOT EXISTS registrado_por TEXT;
ALTER TABLE movimentos_estoque ADD COLUMN IF NOT EXISTS fornecedor_nome TEXT;

-- ─────────────────────────────────────────────────────────
-- 12. NF ENTRADA
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nf_entrada (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_nome TEXT,
  numero_nf       TEXT,
  data_emissao    DATE,
  valor_total     NUMERIC(12,2) DEFAULT 0,
  status          TEXT DEFAULT 'pendente',
  loja            TEXT,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_created ON nf_entrada(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 13. NF ENTRADA ITENS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nf_entrada_itens (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nf_entrada_id   UUID REFERENCES nf_entrada(id) ON DELETE CASCADE,
  descricao       TEXT,
  quantidade      INTEGER DEFAULT 1,
  preco_unitario  NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_itens_nf ON nf_entrada_itens(nf_entrada_id);

-- ─────────────────────────────────────────────────────────
-- 14. VENDAS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendas (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_nome     TEXT,
  cliente_id       UUID,
  vendedor_id      UUID,
  loja             TEXT,
  total            NUMERIC(12,2) DEFAULT 0,
  desconto         NUMERIC(12,2) DEFAULT 0,
  status           TEXT DEFAULT 'ativo',
  forma_pagamento  TEXT,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendas_loja    ON vendas(loja);
CREATE INDEX IF NOT EXISTS idx_vendas_created ON vendas(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 15. VENDA ITENS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venda_itens (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id        UUID REFERENCES vendas(id) ON DELETE CASCADE,
  catalogo_id     UUID,
  nome            TEXT,
  quantidade      INTEGER DEFAULT 1,
  preco_unitario  NUMERIC(12,2) DEFAULT 0,
  subtotal        NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda ON venda_itens(venda_id);

-- ─────────────────────────────────────────────────────────
-- 16. PEDIDOS DE COMPRA
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_nome    TEXT,
  fornecedor_id      UUID,
  loja               TEXT,
  valor_total        NUMERIC(12,2) DEFAULT 0,
  status             TEXT DEFAULT 'pendente',
  observacoes        TEXT,
  previsao_entrega   DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_loja    ON pedidos_compra(loja);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_created ON pedidos_compra(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 17. PEDIDO COMPRA ITENS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedido_compra_itens (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_compra_id UUID REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  descricao        TEXT,
  quantidade       INTEGER DEFAULT 1,
  preco_unitario   NUMERIC(12,2) DEFAULT 0,
  subtotal         NUMERIC(12,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedido_compra_itens_pedido ON pedido_compra_itens(pedido_compra_id);

-- ─────────────────────────────────────────────────────────
-- 18. FINANCEIRO RECEBER
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financeiro_receber (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao        TEXT,
  valor            NUMERIC(12,2) DEFAULT 0,
  vencimento       DATE,
  status           TEXT DEFAULT 'pendente',
  data_pagamento   DATE,
  loja             TEXT,
  cliente_nome     TEXT,
  forma_pagamento  TEXT,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_financeiro_receber_loja       ON financeiro_receber(loja);
CREATE INDEX IF NOT EXISTS idx_financeiro_receber_vencimento ON financeiro_receber(vencimento);

-- ─────────────────────────────────────────────────────────
-- 19. FINANCEIRO PAGAR
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financeiro_pagar (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao        TEXT,
  valor            NUMERIC(12,2) DEFAULT 0,
  vencimento       DATE,
  status           TEXT DEFAULT 'pendente',
  data_pagamento   DATE,
  loja             TEXT,
  fornecedor_nome  TEXT,
  forma_pagamento  TEXT,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_financeiro_pagar_loja       ON financeiro_pagar(loja);
CREATE INDEX IF NOT EXISTS idx_financeiro_pagar_vencimento ON financeiro_pagar(vencimento);

-- ─────────────────────────────────────────────────────────
-- 20. FINANCEIRO LANÇAMENTOS  (sem FK para financeiro_receber/pagar)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao        TEXT,
  valor            NUMERIC(12,2) NOT NULL DEFAULT 0,
  vencimento       DATE,
  data_pagamento   DATE,
  status           TEXT DEFAULT 'pendente',
  tipo             TEXT,
  loja             TEXT,
  venda_id         UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_loja       ON financeiro_lancamentos(loja);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_vencimento ON financeiro_lancamentos(vencimento);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_created    ON financeiro_lancamentos(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 21. FUNCIONÁRIOS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funcionarios (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome           TEXT NOT NULL,
  cpf            TEXT,
  cargo          TEXT,
  loja           TEXT,
  data_admissao  DATE,
  data_demissao  DATE,
  salario        NUMERIC(10,2) DEFAULT 0,
  status         TEXT DEFAULT 'ativo',
  observacoes    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funcionarios_loja ON funcionarios(loja);
CREATE INDEX IF NOT EXISTS idx_funcionarios_nome ON funcionarios(nome);

-- ─────────────────────────────────────────────────────────
-- 22. FOLHA DE PAGAMENTO
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folha_pagamento (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id   UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  funcionario_nome TEXT,
  mes              TEXT NOT NULL,
  salario_base     NUMERIC(10,2) DEFAULT 0,
  horas_extras     NUMERIC(10,2) DEFAULT 0,
  descontos        NUMERIC(10,2) DEFAULT 0,
  beneficios       NUMERIC(10,2) DEFAULT 0,
  vale_transporte  NUMERIC(10,2) DEFAULT 0,
  inss             NUMERIC(10,2) DEFAULT 0,
  ir               NUMERIC(10,2) DEFAULT 0,
  liquido          NUMERIC(10,2) DEFAULT 0,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(funcionario_id, mes)
);
CREATE INDEX IF NOT EXISTS idx_folha_pagamento_mes ON folha_pagamento(mes);

-- ─────────────────────────────────────────────────────────
-- 23. PONTOS (ponto eletrônico)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pontos (
  id                         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id                 UUID,
  usuario_nome               TEXT,
  data                       DATE NOT NULL,
  data_hora                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo                       TEXT,
  loja                       TEXT,
  latitude                   NUMERIC(10,7),
  longitude                  NUMERIC(10,7),
  endereco_aproximado        TEXT,
  dentro_cerca               BOOLEAN DEFAULT TRUE,
  distancia_loja_metros      INTEGER,
  tipo_marcacao              TEXT DEFAULT 'entrada',
  justificativa              TEXT,
  justificativa_aprovada     BOOLEAN,
  justificativa_aprovada_por UUID,
  device_info                TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pontos_usuario_data ON pontos(usuario_id, data);
CREATE INDEX IF NOT EXISTS idx_pontos_data         ON pontos(data);
-- Colunas adicionais para instâncias já existentes (003)
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS latitude                   NUMERIC(10,7);
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS longitude                  NUMERIC(10,7);
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS endereco_aproximado        TEXT;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS dentro_cerca               BOOLEAN DEFAULT TRUE;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS distancia_loja_metros      INTEGER;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS tipo_marcacao              TEXT DEFAULT 'entrada';
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS justificativa              TEXT;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS justificativa_aprovada     BOOLEAN;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS justificativa_aprovada_por UUID;
ALTER TABLE pontos ADD COLUMN IF NOT EXISTS device_info                TEXT;

-- ─────────────────────────────────────────────────────────
-- 24. ASSINATURAS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assinaturas (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id    UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  imagem_url   TEXT,
  assinado_por TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assinaturas_pedido ON assinaturas(pedido_id);

-- ─────────────────────────────────────────────────────────
-- 25. EQUIPES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       TEXT NOT NULL,
  loja       TEXT,
  descricao  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 26. CONFERÊNCIAS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conferencias (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto               TEXT,
  numero_pedido         TEXT,
  numero_nf             TEXT,
  fornecedor            TEXT,
  conferente_nome       TEXT,
  resultado             TEXT,
  motivo_reprovacao     TEXT,
  descricao_reprovacao  TEXT,
  fotos                 JSONB DEFAULT '{}',
  loja                  TEXT,
  data_hora             TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conferencias_data_hora ON conferencias(data_hora DESC);

-- ─────────────────────────────────────────────────────────
-- 27. ASSISTÊNCIAS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assistencias (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente         TEXT,
  telefone        TEXT,
  pedido_ref      TEXT,
  loja            TEXT,
  tipo_problema   TEXT DEFAULT 'Outros',
  observacoes     TEXT,
  status          TEXT DEFAULT 'Aberta',
  prioridade      TEXT DEFAULT 'Normal',
  tecnico_id      UUID,
  tecnico_nome    TEXT,
  data_abertura   DATE,
  data_conclusao  DATE,
  origem          TEXT,
  fotos_cliente   TEXT[] DEFAULT '{}',
  fotos_tecnico   TEXT[] DEFAULT '{}',
  solucao         TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assistencias_status  ON assistencias(status);
CREATE INDEX IF NOT EXISTS idx_assistencias_loja    ON assistencias(loja);
CREATE INDEX IF NOT EXISTS idx_assistencias_created ON assistencias(created_at DESC);
ALTER TABLE assistencias ADD COLUMN IF NOT EXISTS fotos_cliente TEXT[] DEFAULT '{}';
ALTER TABLE assistencias ADD COLUMN IF NOT EXISTS fotos_tecnico TEXT[] DEFAULT '{}';
ALTER TABLE assistencias ADD COLUMN IF NOT EXISTS pedido_ref    TEXT;
ALTER TABLE assistencias ADD COLUMN IF NOT EXISTS origem        TEXT;
ALTER TABLE assistencias ADD COLUMN IF NOT EXISTS solucao       TEXT;
ALTER TABLE assistencias ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────
-- 28. ASSISTÊNCIA ITENS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assistencia_itens (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assistencia_id UUID REFERENCES assistencias(id) ON DELETE CASCADE,
  fornecedor     TEXT,
  descricao      TEXT,
  quantidade     INTEGER DEFAULT 1,
  status         TEXT DEFAULT 'pendente',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assistencia_itens_assis ON assistencia_itens(assistencia_id);

-- ─────────────────────────────────────────────────────────
-- 29. ASSISTÊNCIA TAREFAS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assistencia_tarefas (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assistencia_id        UUID REFERENCES assistencias(id) ON DELETE CASCADE,
  titulo                TEXT NOT NULL,
  descricao             TEXT,
  tipo                  TEXT DEFAULT 'tarefa',
  status                TEXT DEFAULT 'pendente',
  prazo                 DATE,
  criado_automaticamente BOOLEAN DEFAULT FALSE,
  usuario_nome          TEXT,
  observacao_conclusao  TEXT,
  concluido_em          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assistencia_tarefas_assis ON assistencia_tarefas(assistencia_id);

-- ─────────────────────────────────────────────────────────
-- 30. ASSISTÊNCIA INTERAÇÕES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assistencia_interacoes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assistencia_id UUID REFERENCES assistencias(id) ON DELETE CASCADE,
  tipo           TEXT,
  destinatario   TEXT,
  assunto        TEXT,
  conteudo       TEXT,
  usuario_nome   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assistencia_interacoes_assis ON assistencia_interacoes(assistencia_id);

-- ─────────────────────────────────────────────────────────
-- 31. ORDENS DE SERVIÇO
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ordens_servico (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero         TEXT,
  cliente        TEXT,
  loja           TEXT,
  tecnico        TEXT,
  tipo_servico   TEXT,
  status         TEXT DEFAULT 'pendente',
  descricao      TEXT,
  solucao        TEXT,
  valor          NUMERIC(12,2) DEFAULT 0,
  data_abertura  DATE,
  data_conclusao DATE,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status  ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_created ON ordens_servico(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 32. ROTEIROS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roteiros (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data                DATE NOT NULL,
  motorista_nome      TEXT,
  montador_nome       TEXT,
  entregadores_extra  TEXT,
  status              TEXT DEFAULT 'planejado',
  tipo                TEXT DEFAULT 'entregas',
  hora_saida          TEXT,
  hora_termino        TEXT,
  observacoes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roteiros_data ON roteiros(data DESC);

-- ─────────────────────────────────────────────────────────
-- 33. ROTEIRO ITENS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roteiro_itens (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  roteiro_id      UUID REFERENCES roteiros(id) ON DELETE CASCADE,
  ordem           INTEGER DEFAULT 0,
  cliente         TEXT,
  pedido_ref      TEXT,
  loja            TEXT,
  bairro          TEXT,
  endereco        TEXT,
  assistencia_id  UUID,
  status_servico  TEXT,
  concluido       BOOLEAN DEFAULT FALSE,
  hora_conclusao  TEXT,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roteiro_itens_roteiro ON roteiro_itens(roteiro_id);

-- ─────────────────────────────────────────────────────────
-- 34. DECORADORES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decoradores (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome         TEXT NOT NULL,
  telefone     TEXT,
  email        TEXT,
  especialidade TEXT,
  loja         TEXT,
  ativo        BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_decoradores_nome ON decoradores(nome);

-- ─────────────────────────────────────────────────────────
-- 35. CRM LEADS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_leads (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome             TEXT,
  telefone         TEXT,
  email            TEXT,
  loja             TEXT,
  origem           TEXT,
  status           TEXT DEFAULT 'novo',
  estagio          TEXT DEFAULT 'novo',
  interesse        TEXT,
  valor_estimado   NUMERIC(12,2),
  responsavel      TEXT,
  responsavel_id   UUID,
  observacoes      TEXT,
  proxima_acao     DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_loja    ON crm_leads(loja);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status  ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created ON crm_leads(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 36. ORÇAMENTOS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orcamentos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_nome  TEXT,
  cliente_id    UUID,
  loja          TEXT,
  vendedor_nome TEXT,
  total         NUMERIC(12,2) DEFAULT 0,
  status        TEXT DEFAULT 'rascunho',
  validade      DATE,
  observacoes   TEXT,
  itens         JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orcamentos_created ON orcamentos(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 37. NPS RESPOSTAS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nps_respostas (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token          UUID DEFAULT gen_random_uuid() UNIQUE,
  pedido_id      UUID,
  cliente_nome   TEXT,
  loja           TEXT,
  nota           INTEGER,
  comentario     TEXT,
  classificacao  TEXT,
  respondido_em  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nps_respostas_token   ON nps_respostas(token);
CREATE INDEX IF NOT EXISTS idx_nps_respostas_created ON nps_respostas(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 38. DEVOLUÇÕES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devolucoes (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id        UUID,
  cliente          TEXT,
  loja             TEXT,
  motivo           TEXT,
  tipo             TEXT DEFAULT 'total',
  status           TEXT DEFAULT 'pendente',
  valor_devolvido  NUMERIC(12,2) DEFAULT 0,
  observacoes      TEXT,
  criado_por       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devolucoes_created ON devolucoes(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 39. LOCALIZAÇÕES DA EQUIPE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS localizacoes_equipe (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id       UUID UNIQUE,
  usuario_nome     TEXT,
  latitude         NUMERIC(10,7),
  longitude        NUMERIC(10,7),
  status           TEXT,
  pedido_atual_id  UUID,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_localizacoes_updated ON localizacoes_equipe(updated_at);

-- ─────────────────────────────────────────────────────────
-- 40. CONSIGNAÇÕES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consignacoes (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_nome          TEXT,
  loja                  TEXT,
  status                TEXT DEFAULT 'aberta',
  valor_total           NUMERIC(12,2) DEFAULT 0,
  data_saida            DATE,
  data_retorno_prevista DATE,
  data_retorno_real     DATE,
  observacoes           TEXT,
  itens                 JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consignacoes_created ON consignacoes(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 41. ACABAMENTOS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acabamentos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       TEXT NOT NULL,
  descricao  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 42. TECIDOS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tecidos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       TEXT NOT NULL,
  descricao  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 43. METAS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metas (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo           TEXT NOT NULL,
  referencia_id  TEXT NOT NULL,
  referencia_nome TEXT,
  mes            INTEGER NOT NULL,
  ano            INTEGER NOT NULL,
  valor_meta     NUMERIC(12,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tipo, referencia_id, mes, ano)
);
CREATE INDEX IF NOT EXISTS idx_metas_mes_ano ON metas(mes, ano);

-- ─────────────────────────────────────────────────────────
-- 44. REPRESENTANTES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS representantes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome           TEXT NOT NULL,
  telefone       TEXT,
  email          TEXT,
  cpf            TEXT,
  comissao       NUMERIC(5,2) DEFAULT 0,
  fornecedor_id  UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  ativo          BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_representantes_nome ON representantes(nome);

-- ─────────────────────────────────────────────────────────
-- 45. HISTÓRICO (legado de pedidosService.addHistorico)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historico (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id     UUID,
  tipo          TEXT,
  descricao     TEXT,
  usuario_email TEXT,
  usuario_nome  TEXT,
  data_hora     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_historico_pedido ON historico(pedido_id);

-- ─────────────────────────────────────────────────────────
-- 46. CONTATOS HISTÓRICO (histórico de contato com clientes)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contatos_historico (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id    UUID REFERENCES clientes(id) ON DELETE CASCADE,
  cliente_nome  TEXT,
  tipo          TEXT,
  assunto       TEXT,
  descricao     TEXT,
  responsavel   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contatos_historico_cliente ON contatos_historico(cliente_id);

-- ─────────────────────────────────────────────────────────
-- 47. AUDIT LOG
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id        UUID,
  acao              TEXT,
  tabela            TEXT,
  registro_id       TEXT,
  dados_anteriores  JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created  ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario  ON audit_log(usuario_id);

-- ─────────────────────────────────────────────────────────
-- 48. TABELAS CRIADAS EM SQLs ANTERIORES — garantir colunas
-- ─────────────────────────────────────────────────────────

-- pedidos_timeline (001)
CREATE TABLE IF NOT EXISTS pedidos_timeline (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id    UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  usuario_id   UUID,
  usuario_nome TEXT,
  tipo         TEXT NOT NULL,
  descricao    TEXT NOT NULL,
  anexos       TEXT[] DEFAULT '{}',
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_timeline_pedido ON pedidos_timeline(pedido_id);

-- pedidos_followup (001)
CREATE TABLE IF NOT EXISTS pedidos_followup (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id    UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  usuario_id   UUID,
  usuario_nome TEXT,
  texto        TEXT NOT NULL,
  anexos       TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_followup_pedido ON pedidos_followup(pedido_id);

-- notificacoes (002)
CREATE TABLE IF NOT EXISTS notificacoes (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id          UUID,
  tipo                TEXT NOT NULL,
  titulo              TEXT NOT NULL,
  mensagem            TEXT NOT NULL,
  lida                BOOLEAN DEFAULT FALSE,
  link                TEXT,
  pedido_id           UUID,
  origem_usuario_id   UUID,
  origem_usuario_nome TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida    ON notificacoes(lida);

-- chat_conversas (002)
CREATE TABLE IF NOT EXISTS chat_conversas (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo       TEXT DEFAULT 'direto',
  nome       TEXT,
  criado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- chat_participantes (002)
CREATE TABLE IF NOT EXISTS chat_participantes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id    UUID REFERENCES chat_conversas(id) ON DELETE CASCADE,
  usuario_id     UUID,
  ultima_leitura TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversa_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_participantes_usuario ON chat_participantes(usuario_id);

-- chat_mensagens (002)
CREATE TABLE IF NOT EXISTS chat_mensagens (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id  UUID REFERENCES chat_conversas(id) ON DELETE CASCADE,
  usuario_id   UUID,
  usuario_nome TEXT,
  texto        TEXT,
  anexos       TEXT[] DEFAULT '{}',
  pedido_id    UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_conversa ON chat_mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_created  ON chat_mensagens(created_at);

-- escalas_trabalho (003)
CREATE TABLE IF NOT EXISTS escalas_trabalho (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id            UUID,
  loja_id               UUID,
  dia_semana            INTEGER,
  hora_entrada          TIME NOT NULL,
  hora_saida_almoco     TIME,
  hora_retorno_almoco   TIME,
  hora_saida            TIME NOT NULL,
  tolerancia_minutos    INTEGER DEFAULT 10,
  ativo                 BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_escalas_usuario ON escalas_trabalho(usuario_id);

-- ponto_ocorrencias (003)
CREATE TABLE IF NOT EXISTS ponto_ocorrencias (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id   UUID,
  loja_id      UUID,
  data         DATE NOT NULL,
  tipo         TEXT NOT NULL,
  descricao    TEXT,
  minutos      INTEGER,
  justificativa TEXT,
  status       TEXT DEFAULT 'pendente',
  aprovado_por UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ponto_ocorrencias_usuario ON ponto_ocorrencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ponto_ocorrencias_data    ON ponto_ocorrencias(data);

-- cercas_virtuais (003)
CREATE TABLE IF NOT EXISTS cercas_virtuais (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id      UUID,
  nome         TEXT NOT NULL,
  latitude     NUMERIC(10,7) NOT NULL,
  longitude    NUMERIC(10,7) NOT NULL,
  raio_metros  INTEGER DEFAULT 200,
  ativo        BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cercas_virtuais_loja ON cercas_virtuais(loja_id);

-- extratos_bancarios (007)
CREATE TABLE IF NOT EXISTS extratos_bancarios (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id         UUID,
  banco           TEXT NOT NULL,
  agencia         TEXT,
  conta           TEXT,
  data_inicio     DATE NOT NULL,
  data_fim        DATE NOT NULL,
  saldo_inicial   NUMERIC(15,2) DEFAULT 0,
  saldo_final     NUMERIC(15,2) DEFAULT 0,
  importado_por   UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_extratos_bancarios_loja    ON extratos_bancarios(loja_id);
CREATE INDEX IF NOT EXISTS idx_extratos_bancarios_created ON extratos_bancarios(created_at DESC);
-- Remover constraints perigosas de versões anteriores
ALTER TABLE extratos_bancarios DROP CONSTRAINT IF EXISTS extratos_bancarios_importado_por_fkey;

-- extrato_transacoes (007)
CREATE TABLE IF NOT EXISTS extrato_transacoes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extrato_id     UUID REFERENCES extratos_bancarios(id) ON DELETE CASCADE,
  data           DATE NOT NULL,
  descricao      TEXT NOT NULL,
  valor          NUMERIC(15,2) NOT NULL,
  tipo           TEXT NOT NULL,
  conciliado     BOOLEAN DEFAULT FALSE,
  lancamento_id  UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_extrato_transacoes_extrato    ON extrato_transacoes(extrato_id);
CREATE INDEX IF NOT EXISTS idx_extrato_transacoes_data       ON extrato_transacoes(data);
CREATE INDEX IF NOT EXISTS idx_extrato_transacoes_conciliado ON extrato_transacoes(conciliado);
-- Remover constraints perigosas de versões anteriores
ALTER TABLE extrato_transacoes DROP CONSTRAINT IF EXISTS extrato_transacoes_tipo_check;
ALTER TABLE extrato_transacoes DROP CONSTRAINT IF EXISTS extrato_transacoes_lancamento_id_fkey;
ALTER TABLE extrato_transacoes ADD COLUMN IF NOT EXISTS lancamento_id UUID;

-- ─────────────────────────────────────────────────────────
-- 49. SEQUENCES — numeração automática
-- ─────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_numero_pedido    START 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_produto   START 100001;

-- Aplicar defaults com tratamento de erro
DO $$ BEGIN
  ALTER TABLE pedidos          ALTER COLUMN numero_pedido  SET DEFAULT nextval('seq_numero_pedido');
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE catalogo_produtos ALTER COLUMN codigo_produto SET DEFAULT nextval('seq_codigo_produto');
EXCEPTION WHEN others THEN NULL; END $$;

-- Backfill de registros sem número
UPDATE pedidos          SET numero_pedido  = nextval('seq_numero_pedido')  WHERE numero_pedido  IS NULL;
UPDATE catalogo_produtos SET codigo_produto = nextval('seq_codigo_produto') WHERE codigo_produto IS NULL;
UPDATE catalogo_produtos SET codigo_barras  = LPAD(codigo_produto::TEXT, 13, '0')
  WHERE codigo_barras IS NULL AND codigo_produto IS NOT NULL;

-- Trigger: gera codigo_barras automaticamente
CREATE OR REPLACE FUNCTION fn_auto_codigo_barras()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_produto IS NOT NULL AND (NEW.codigo_barras IS NULL OR NEW.codigo_barras = '') THEN
    NEW.codigo_barras := LPAD(NEW.codigo_produto::TEXT, 13, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_codigo_barras ON catalogo_produtos;
CREATE TRIGGER trg_auto_codigo_barras
  BEFORE INSERT OR UPDATE ON catalogo_produtos
  FOR EACH ROW EXECUTE FUNCTION fn_auto_codigo_barras();
