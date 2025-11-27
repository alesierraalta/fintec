/**
 * Memory Retriever - Recuperación inteligente de memorias relevantes
 * 
 * Combina búsqueda semántica, contexto histórico y perfil de usuario
 * para proporcionar contexto enriquecido al modelo de IA.
 */

import { logger } from '@/lib/utils/logger';
import { searchMemories, SemanticSearchResult } from './semantic-memory';
import { searchConversations, ConversationMessage } from './episodic-memory';
import { getUserProfile, UserProfile } from './procedural-memory';

export interface RetrievedContext {
  semanticMemories: SemanticSearchResult[];
  relevantConversations: ConversationMessage[];
  userProfile: UserProfile | null;
  summary: string;
}

/**
 * Recupera contexto completo de memoria para una query
 */
export async function retrieveMemoryContext(
  userId: string,
  query: string,
  options: {
    maxSemanticMemories?: number;
    maxConversations?: number;
    lookbackMonths?: number;
    minSimilarity?: number;
  } = {}
): Promise<RetrievedContext> {
  try {
    const {
      maxSemanticMemories = 5,
      maxConversations = 10,
      lookbackMonths = 3,
      minSimilarity = 0.7,
    } = options;

    // 1. Búsqueda semántica de memorias relevantes
    const semanticMemories = await searchMemories(userId, query, {
      maxResults: maxSemanticMemories,
      minSimilarity,
    });

    // 2. Recuperar conversaciones históricas relevantes
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - lookbackMonths);

    const relevantConversations = await searchConversations(userId, {
      limit: maxConversations,
      startDate,
      endDate,
      minImportance: 0.3, // Solo conversaciones con cierta importancia
    });

    // 3. Obtener perfil de usuario
    const userProfile = await getUserProfile(userId);

    // 4. Generar resumen del contexto
    const summary = generateContextSummary(
      semanticMemories,
      relevantConversations,
      userProfile
    );

    logger.debug(`[memory-retriever] Retrieved context: ${semanticMemories.length} memories, ${relevantConversations.length} conversations`);

    return {
      semanticMemories,
      relevantConversations,
      userProfile,
      summary,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[memory-retriever] Error retrieving memory context:', error);
    // Retornar contexto vacío en caso de error
    return {
      semanticMemories: [],
      relevantConversations: [],
      userProfile: null,
      summary: '',
    };
  }
}

/**
 * Genera un resumen del contexto recuperado
 */
function generateContextSummary(
  memories: SemanticSearchResult[],
  conversations: ConversationMessage[],
  profile: UserProfile | null
): string {
  const parts: string[] = [];

  if (memories.length > 0) {
    parts.push(`Memorias relevantes: ${memories.length}`);
    memories.slice(0, 3).forEach((mem, idx) => {
      parts.push(`  ${idx + 1}. [${mem.memoryType}] ${mem.content.substring(0, 80)}...`);
    });
  }

  if (conversations.length > 0) {
    parts.push(`Conversaciones históricas: ${conversations.length}`);
  }

  if (profile) {
    const hasPreferences = Object.keys(profile.financialPreferences || {}).length > 0;
    const hasRules = (profile.learnedRules || []).length > 0;
    if (hasPreferences || hasRules) {
      parts.push('Perfil de usuario disponible');
    }
  }

  return parts.join('\n');
}

/**
 * Formatea el contexto recuperado para inyección en prompts
 */
export function formatContextForPrompt(context: RetrievedContext): string {
  const parts: string[] = [];

  // Memoria semántica
  if (context.semanticMemories.length > 0) {
    parts.push('## MEMORIA DEL USUARIO');
    parts.push('Información importante sobre el usuario:');
    context.semanticMemories.forEach((mem, idx) => {
      parts.push(`${idx + 1}. [${mem.memoryType.toUpperCase()}] ${mem.content}`);
    });
    parts.push('');
  }

  // Perfil de usuario
  if (context.userProfile) {
    const profile = context.userProfile;
    
    if (Object.keys(profile.financialPreferences || {}).length > 0) {
      parts.push('## PREFERENCIAS FINANCIERAS');
      Object.entries(profile.financialPreferences).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          parts.push(`- ${key}: ${JSON.stringify(value)}`);
        }
      });
      parts.push('');
    }

    if (profile.communicationStyle && Object.keys(profile.communicationStyle).length > 0) {
      parts.push('## ESTILO DE COMUNICACIÓN');
      if (profile.communicationStyle.tone) {
        parts.push(`- Tono preferido: ${profile.communicationStyle.tone}`);
      }
      if (profile.communicationStyle.verbosity) {
        parts.push(`- Verbosidad: ${profile.communicationStyle.verbosity}`);
      }
      parts.push('');
    }

    if (profile.learnedRules && profile.learnedRules.length > 0) {
      parts.push('## REGLAS DE INTERACCIÓN');
      profile.learnedRules
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5)
        .forEach((rule, idx) => {
          parts.push(`${idx + 1}. ${rule.condition} → ${rule.action}`);
        });
      parts.push('');
    }
  }

  // Conversaciones históricas relevantes (solo si hay pocas)
  if (context.relevantConversations.length > 0 && context.relevantConversations.length <= 5) {
    parts.push('## CONTEXTO HISTÓRICO');
    parts.push('Conversaciones anteriores relevantes:');
    context.relevantConversations.slice(0, 3).forEach((conv) => {
      parts.push(`- [${conv.role}] ${conv.content.substring(0, 100)}...`);
    });
    parts.push('');
  }

  return parts.join('\n');
}

