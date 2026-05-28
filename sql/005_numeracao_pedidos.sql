-- BLOCO 5: Numeração sequencial de pedidos e produtos
-- Execute este arquivo no Supabase Dashboard > SQL Editor

-- 1. Colunas (IF NOT EXISTS é seguro para reexecutar)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero_pedido INTEGER;
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS codigo_produto INTEGER;
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS codigo_barras TEXT;

-- 2. Sequências
CREATE SEQUENCE IF NOT EXISTS seq_numero_pedido START 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_produto START 100001;

-- 3. Defaults automáticos nas colunas
ALTER TABLE pedidos ALTER COLUMN numero_pedido SET DEFAULT nextval('seq_numero_pedido');
ALTER TABLE catalogo_produtos ALTER COLUMN codigo_produto SET DEFAULT nextval('seq_codigo_produto');

-- 4. Backfill de registros existentes sem número
UPDATE pedidos SET numero_pedido = nextval('seq_numero_pedido') WHERE numero_pedido IS NULL;
UPDATE catalogo_produtos SET codigo_produto = nextval('seq_codigo_produto') WHERE codigo_produto IS NULL;
UPDATE catalogo_produtos SET codigo_barras = LPAD(codigo_produto::TEXT, 13, '0') WHERE codigo_barras IS NULL;

-- 5. Trigger para gerar codigo_barras automaticamente a partir de codigo_produto
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
