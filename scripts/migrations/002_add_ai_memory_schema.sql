-- Migration: Add AI Memory System Schema
-- Description: Adds tables for episodic, semantic, and procedural memory for AI assistant

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- 1. MEMORIA EPISÓDICA (Conversaciones históricas)
-- ============================================

-- Tabla de sesiones de conversación
CREATE TABLE IF NOT EXISTS ai_conversation_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0
);

-- Tabla de mensajes de conversación
CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT REFERENCES ai_conversation_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para memoria episódica
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON ai_conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_message ON ai_conversation_sessions(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_session ON ai_conversation_messages(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_created ON ai_conversation_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_importance ON ai_conversation_messages(user_id, importance_score DESC);

-- ============================================
-- 2. MEMORIA SEMÁNTICA (Hechos y preferencias)
-- ============================================

-- Tabla de memorias semánticas con embeddings
CREATE TABLE IF NOT EXISTS ai_semantic_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'fact', 'pattern', 'rule')),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para memoria semántica
CREATE INDEX IF NOT EXISTS idx_semantic_memories_user_type ON ai_semantic_memories(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_importance ON ai_semantic_memories(user_id, importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_last_accessed ON ai_semantic_memories(user_id, last_accessed_at DESC NULLS LAST);

-- Índice vectorial para búsqueda semántica (HNSW para mejor rendimiento)
CREATE INDEX IF NOT EXISTS idx_semantic_memories_embedding ON ai_semantic_memories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- 3. MEMORIA PROCEDIMENTAL (Perfil de usuario)
-- ============================================

-- Tabla de perfil de usuario aprendido
CREATE TABLE IF NOT EXISTS ai_user_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  communication_style JSONB DEFAULT '{}',
  financial_preferences JSONB DEFAULT '{}',
  interaction_patterns JSONB DEFAULT '{}',
  learned_rules JSONB DEFAULT '[]',
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. FUNCIONES RPC PARA BÚSQUEDA VECTORIAL
-- ============================================

-- Función para búsqueda semántica de memorias
CREATE OR REPLACE FUNCTION search_semantic_memories(
  query_embedding vector(1536),
  user_id_param UUID,
  memory_types TEXT[] DEFAULT NULL,
  match_threshold DECIMAL DEFAULT 0.7,
  match_count INTEGER DEFAULT 5,
  ef_search INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  content TEXT,
  similarity DECIMAL,
  importance_score DECIMAL,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.memory_type,
    sm.content,
    1 - (sm.embedding <=> query_embedding) AS similarity,
    sm.importance_score,
    sm.metadata
  FROM ai_semantic_memories sm
  WHERE sm.user_id = user_id_param
    AND (memory_types IS NULL OR sm.memory_type = ANY(memory_types))
    AND sm.embedding IS NOT NULL
    AND (1 - (sm.embedding <=> query_embedding)) >= match_threshold
  ORDER BY sm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Función para actualizar last_accessed_at cuando se accede a una memoria
CREATE OR REPLACE FUNCTION update_memory_access(
  memory_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ai_semantic_memories
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE id = memory_id;
END;
$$;

-- Función para actualizar contador de mensajes en sesión
CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ai_conversation_sessions
  SET 
    message_count = (
      SELECT COUNT(*) 
      FROM ai_conversation_messages 
      WHERE session_id = NEW.session_id
    ),
    last_message_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at en memorias semánticas
DROP TRIGGER IF EXISTS update_semantic_memories_updated_at ON ai_semantic_memories;
CREATE TRIGGER update_semantic_memories_updated_at
  BEFORE UPDATE ON ai_semantic_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar last_updated_at en perfil de usuario
DROP TRIGGER IF EXISTS update_user_profile_updated_at ON ai_user_profile;
CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON ai_user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar contador de mensajes cuando se inserta un mensaje
DROP TRIGGER IF EXISTS update_session_on_message_insert ON ai_conversation_messages;
CREATE TRIGGER update_session_on_message_insert
  AFTER INSERT ON ai_conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_message_count();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE ai_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_semantic_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_profile ENABLE ROW LEVEL SECURITY;

-- Políticas para ai_conversation_sessions
DROP POLICY IF EXISTS "Users can view own conversation sessions" ON ai_conversation_sessions;
CREATE POLICY "Users can view own conversation sessions"
  ON ai_conversation_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversation sessions" ON ai_conversation_sessions;
CREATE POLICY "Users can insert own conversation sessions"
  ON ai_conversation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversation sessions" ON ai_conversation_sessions;
CREATE POLICY "Users can update own conversation sessions"
  ON ai_conversation_sessions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversation sessions" ON ai_conversation_sessions;
CREATE POLICY "Users can delete own conversation sessions"
  ON ai_conversation_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para ai_conversation_messages
DROP POLICY IF EXISTS "Users can view own conversation messages" ON ai_conversation_messages;
CREATE POLICY "Users can view own conversation messages"
  ON ai_conversation_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversation messages" ON ai_conversation_messages;
CREATE POLICY "Users can insert own conversation messages"
  ON ai_conversation_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversation messages" ON ai_conversation_messages;
CREATE POLICY "Users can update own conversation messages"
  ON ai_conversation_messages FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversation messages" ON ai_conversation_messages;
CREATE POLICY "Users can delete own conversation messages"
  ON ai_conversation_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para ai_semantic_memories
DROP POLICY IF EXISTS "Users can view own semantic memories" ON ai_semantic_memories;
CREATE POLICY "Users can view own semantic memories"
  ON ai_semantic_memories FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own semantic memories" ON ai_semantic_memories;
CREATE POLICY "Users can insert own semantic memories"
  ON ai_semantic_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own semantic memories" ON ai_semantic_memories;
CREATE POLICY "Users can update own semantic memories"
  ON ai_semantic_memories FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own semantic memories" ON ai_semantic_memories;
CREATE POLICY "Users can delete own semantic memories"
  ON ai_semantic_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para ai_user_profile
DROP POLICY IF EXISTS "Users can view own profile" ON ai_user_profile;
CREATE POLICY "Users can view own profile"
  ON ai_user_profile FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON ai_user_profile;
CREATE POLICY "Users can insert own profile"
  ON ai_user_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON ai_user_profile;
CREATE POLICY "Users can update own profile"
  ON ai_user_profile FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON ai_user_profile;
CREATE POLICY "Users can delete own profile"
  ON ai_user_profile FOR DELETE
  USING (auth.uid() = user_id);

