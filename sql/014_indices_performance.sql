-- 014: Índices de performance para escala
-- Execute no Supabase Dashboard > SQL Editor
-- IMPORTANTE: execute em horário de baixo uso pois CREATE INDEX pode demorar em tabelas grandes.

-- Extensão para busca textual com ilike
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Pedidos ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pedidos_numero_pedido ON pedidos USING gin (numero_pedido gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente      ON pedidos USING gin (cliente gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at   ON pedidos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_status       ON pedidos (status);
CREATE INDEX IF NOT EXISTS idx_pedidos_loja         ON pedidos (local_separacao);

-- ── Assistências ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assistencias_cliente    ON assistencias USING gin (cliente gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assistencias_pedido_ref ON assistencias USING gin (pedido_ref gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assistencias_created_at ON assistencias (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistencias_status     ON assistencias (status);

-- ── Clientes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clientes_nome     ON clientes USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes USING gin (cpf_cnpj gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes USING gin (telefone gin_trgm_ops);

-- ── Fornecedores ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome ON fornecedores USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores USING gin (cnpj gin_trgm_ops);

-- ── Catálogo de Produtos ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_catalogo_nome         ON catalogo_produtos USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_catalogo_codigo_barras ON catalogo_produtos USING gin (codigo_barras gin_trgm_ops);

-- ── Financeiro ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fin_receber_descricao  ON financeiro_receber USING gin (descricao gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fin_receber_vencimento ON financeiro_receber (vencimento);
CREATE INDEX IF NOT EXISTS idx_fin_receber_loja       ON financeiro_receber (loja);
CREATE INDEX IF NOT EXISTS idx_fin_pagar_descricao    ON financeiro_pagar USING gin (descricao gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fin_pagar_vencimento   ON financeiro_pagar (vencimento);
CREATE INDEX IF NOT EXISTS idx_fin_pagar_loja         ON financeiro_pagar (loja);

-- ── Ordens de Serviço ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_os_titulo      ON ordens_servico USING gin (titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_os_cliente     ON ordens_servico USING gin (cliente gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_os_created_at  ON ordens_servico (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_status      ON ordens_servico (status);

-- ── CRM ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_nome       ON crm_leads USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_crm_created_at ON crm_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_loja       ON crm_leads (loja);

-- ── Vendas ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_nome ON vendas USING gin (cliente_nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at   ON vendas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_loja         ON vendas (loja);

-- ── Estoque ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_estoque_nome_produto  ON estoque USING gin (nome_produto gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_estoque_codigo_barras ON estoque USING gin (codigo_barras gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_estoque_loja          ON estoque (loja);
