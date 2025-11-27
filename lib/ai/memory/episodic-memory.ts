/**
 * Episodic Memory - Almacenamiento y recuperación de conversaciones históricas
 * 
 * Gestiona la memoria episódica del asistente IA, almacenando todas las
 * conversaciones históricas del usuario para permitir recuperación contextual.
 */

import { createSupabaseServiceClient } from '@/repositories/supabase/client';
import { logger } from '@/lib/utils/logger';
import { ChatMessage } from '../chat-assistant';

export interface ConversationSession {
  id: string;
  userId: string;
  title?: string;
  summary?: string;
  metadata: Record<string, any>;
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
}

export interface ConversationMessage {
  id: string;
  userId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any>;
  importanceScore: number;
  createdAt: Date;
}

export interface ConversationSearchOptions {
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  sessionId?: string;
  minImportance?: number;
}

/**
 * Crea o actualiza una sesión de conversación
 */
export async function createOrUpdateSession(
  sessionId: string,
  userId: string,
  title?: string,
  summary?: string,
  metadata?: Record<string, any>
): Promise<ConversationSession> {
  try {
    const client = createSupabaseServiceClient();
    
    const { data, error } = await (client
      .from('ai_conversation_sessions') as any)
      .upsert({
        id: sessionId,
        user_id: userId,
        title: title || null,
        summary: summary || null,
        metadata: metadata || {},
        last_message_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create/update session: ${error.message}`);
    }

    return mapSessionFromDb(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[episodic-memory] Error creating/updating session:', error);
    throw new Error(`Failed to create/update session: ${errorMessage}`);
  }
}

/**
 * Almacena un mensaje de conversación
 */
export async function storeMessage(
  userId: string,
  sessionId: string,
  message: ChatMessage,
  importanceScore: number = 0.5,
  metadata?: Record<string, any>
): Promise<ConversationMessage> {
  try {
    const client = createSupabaseServiceClient();
    
    // Asegurar que la sesión existe
    await createOrUpdateSession(sessionId, userId);
    
    const { data, error } = await (client
      .from('ai_conversation_messages') as any)
      .insert({
        user_id: userId,
        session_id: sessionId,
        role: message.role,
        content: message.content,
        metadata: metadata || {},
        importance_score: Math.max(0, Math.min(1, importanceScore)),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store message: ${error.message}`);
    }

    logger.debug(`[episodic-memory] Stored message ${data.id} for session ${sessionId}`);
    return mapMessageFromDb(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[episodic-memory] Error storing message:', error);
    throw new Error(`Failed to store message: ${errorMessage}`);
  }
}

/**
 * Almacena múltiples mensajes en batch
 */
export async function storeMessages(
  userId: string,
  sessionId: string,
  messages: ChatMessage[],
  importanceScores?: number[]
): Promise<ConversationMessage[]> {
  try {
    const client = createSupabaseServiceClient();
    
    // Asegurar que la sesión existe
    await createOrUpdateSession(sessionId, userId);
    
    const messagesToInsert = messages.map((msg, index) => ({
      user_id: userId,
      session_id: sessionId,
      role: msg.role,
      content: msg.content,
      metadata: {},
      importance_score: Math.max(0, Math.min(1, importanceScores?.[index] ?? 0.5)),
    }));

    const { data, error } = await (client
      .from('ai_conversation_messages') as any)
      .insert(messagesToInsert)
      .select();

    if (error) {
      throw new Error(`Failed to store messages: ${error.message}`);
    }

    logger.debug(`[episodic-memory] Stored ${data.length} messages for session ${sessionId}`);
    return data.map(mapMessageFromDb);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[episodic-memory] Error storing messages:', error);
    throw new Error(`Failed to store messages: ${errorMessage}`);
  }
}

/**
 * Recupera mensajes de una sesión específica
 */
export async function getSessionMessages(
  userId: string,
  sessionId: string,
  limit?: number
): Promise<ConversationMessage[]> {
  try {
    const client = createSupabaseServiceClient();
    
    let query = (client
      .from('ai_conversation_messages') as any)
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to retrieve messages: ${error.message}`);
    }

    return (data || []).map(mapMessageFromDb);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[episodic-memory] Error retrieving messages:', error);
    throw new Error(`Failed to retrieve messages: ${errorMessage}`);
  }
}

/**
 * Busca conversaciones históricas del usuario
 */
export async function searchConversations(
  userId: string,
  options: ConversationSearchOptions = {}
): Promise<ConversationMessage[]> {
  try {
    const client = createSupabaseServiceClient();
    
    let query = (client
      .from('ai_conversation_messages') as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options.sessionId) {
      query = query.eq('session_id', options.sessionId);
    }

    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options.minImportance !== undefined) {
      query = query.gte('importance_score', options.minImportance);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    } else {
      // Default limit para evitar cargar demasiados mensajes
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to search conversations: ${error.message}`);
    }

    return (data || []).map(mapMessageFromDb);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[episodic-memory] Error searching conversations:', error);
    throw new Error(`Failed to search conversations: ${errorMessage}`);
  }
}

/**
 * Obtiene todas las sesiones del usuario
 */
export async function getUserSessions(
  userId: string,
  limit: number = 50
): Promise<ConversationSession[]> {
  try {
    const client = createSupabaseServiceClient();
    
    const { data, error } = await (client
      .from('ai_conversation_sessions') as any)
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to retrieve sessions: ${error.message}`);
    }

    return (data || []).map(mapSessionFromDb);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[episodic-memory] Error retrieving sessions:', error);
    throw new Error(`Failed to retrieve sessions: ${errorMessage}`);
  }
}

/**
 * Actualiza el título y resumen de una sesión
 */
export async function updateSession(
  sessionId: string,
  userId: string,
  updates: {
    title?: string;
    summary?: string;
    metadata?: Record<string, any>;
  }
): Promise<ConversationSession> {
  try {
    const client = createSupabaseServiceClient();
    
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.summary !== undefined) updateData.summary = updates.summary;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    const { data, error } = await (client
      .from('ai_conversation_sessions') as any)
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return mapSessionFromDb(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[episodic-memory] Error updating session:', error);
    throw new Error(`Failed to update session: ${errorMessage}`);
  }
}

/**
 * Elimina una sesión y todos sus mensajes
 */
export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    const client = createSupabaseServiceClient();
    
    // Los mensajes se eliminan automáticamente por CASCADE
    const { error } = await (client
      .from('ai_conversation_sessions') as any)
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }

    logger.debug(`[episodic-memory] Deleted session ${sessionId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[episodic-memory] Error deleting session:', error);
    throw new Error(`Failed to delete session: ${errorMessage}`);
  }
}

// Helper functions para mapear datos de DB

function mapSessionFromDb(data: any): ConversationSession {
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title || undefined,
    summary: data.summary || undefined,
    metadata: data.metadata || {},
    startedAt: new Date(data.started_at),
    lastMessageAt: new Date(data.last_message_at),
    messageCount: data.message_count || 0,
  };
}

function mapMessageFromDb(data: any): ConversationMessage {
  return {
    id: data.id,
    userId: data.user_id,
    sessionId: data.session_id,
    role: data.role,
    content: data.content,
    metadata: data.metadata || {},
    importanceScore: parseFloat(data.importance_score) || 0.5,
    createdAt: new Date(data.created_at),
  };
}

