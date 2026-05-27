-- BLOCO 2: Notificações internas e chat
-- Execute este arquivo no Supabase Dashboard > SQL Editor

-- 1. Notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  link TEXT,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  origem_usuario_id UUID REFERENCES usuarios(id),
  origem_usuario_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Conversas de chat
CREATE TABLE IF NOT EXISTS chat_conversas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT DEFAULT 'direto',
  nome TEXT,
  criado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Participantes
CREATE TABLE IF NOT EXISTS chat_participantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID REFERENCES chat_conversas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  ultima_leitura TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversa_id, usuario_id)
);

-- 4. Mensagens
CREATE TABLE IF NOT EXISTS chat_mensagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID REFERENCES chat_conversas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  usuario_nome TEXT,
  texto TEXT,
  anexos TEXT[] DEFAULT '{}',
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bucket de storage (criar manualmente no Supabase Dashboard > Storage)
-- Nome: chat-anexos | Acesso: público
