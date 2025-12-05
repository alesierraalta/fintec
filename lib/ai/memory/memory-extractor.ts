/**
 * Memory Extractor - Extracción automática de información importante de conversaciones
 * 
 * Analiza conversaciones para extraer hechos, preferencias, patrones y reglas
 * que deben almacenarse en la memoria semántica y procedimental.
 */

import { openai } from '../config';
import { logger } from '@/lib/utils/logger';
import { ChatMessage } from '../chat/chat-handler';
import { storeMemory, MemoryType } from './semantic-memory';
import { upsertUserProfile, addLearnedRule } from './procedural-memory';

export interface ExtractedMemory {
  type: MemoryType;
  content: string;
  importanceScore: number;
  metadata?: Record<string, any>;
}

export interface ExtractionResult {
  memories: ExtractedMemory[];
  profileUpdates?: {
    communicationStyle?: Record<string, any>;
    financialPreferences?: Record<string, any>;
    interactionPatterns?: Record<string, any>;
  };
  learnedRules?: Array<{
    condition: string;
    action: string;
    priority: number;
  }>;
}

/**
 * Extrae información importante de una conversación
 */
export async function extractMemoriesFromConversation(
  userId: string,
  messages: ChatMessage[]
): Promise<ExtractionResult> {
  try {
    // Solo procesar si hay suficientes mensajes
    if (messages.length < 2) {
      return { memories: [] };
    }

    // Preparar contexto de la conversación
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Usar LLM para extraer información importante
    const extractionPrompt = `Analiza la siguiente conversación y extrae información importante sobre el usuario. 
Identifica:
1. Preferencias explícitas o implícitas (preference)
2. Hechos sobre el usuario (fact)
3. Patrones de comportamiento (pattern)
4. Reglas de interacción que el usuario prefiere (rule)

Conversación:
${conversationText}

Responde SOLO con un JSON válido en este formato:
{
  "memories": [
    {
      "type": "preference|fact|pattern|rule",
      "content": "Descripción clara y concisa",
      "importanceScore": 0.0-1.0,
      "metadata": {}
    }
  ],
  "profileUpdates": {
    "communicationStyle": {},
    "financialPreferences": {},
    "interactionPatterns": {}
  },
  "learnedRules": [
    {
      "condition": "cuando...",
      "action": "entonces...",
      "priority": 0.0-1.0
    }
  ]
}

Si no hay información importante, retorna {"memories": []}.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en extraer información importante de conversaciones. Responde SOLO con JSON válido, sin texto adicional.',
        },
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.warn('[memory-extractor] No content in extraction response');
      return { memories: [] };
    }

    // Parsear JSON de la respuesta
    let extractionResult: ExtractionResult;
    try {
      // Limpiar el contenido (puede tener markdown code blocks)
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      extractionResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      logger.error('[memory-extractor] Failed to parse extraction result:', parseError);
      logger.debug('[memory-extractor] Raw content:', content);
      return { memories: [] };
    }

    // Validar y filtrar memorias
    const validMemories = (extractionResult.memories || []).filter(
      (mem: any) => 
        mem.type && 
        mem.content && 
        ['preference', 'fact', 'pattern', 'rule'].includes(mem.type)
    );

    logger.info(`[memory-extractor] Extracted ${validMemories.length} memories from conversation`);
    
    return {
      memories: validMemories,
      profileUpdates: extractionResult.profileUpdates,
      learnedRules: extractionResult.learnedRules,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[memory-extractor] Error extracting memories:', error);
    // No lanzar error, solo retornar resultado vacío para no interrumpir el flujo
    return { memories: [] };
  }
}

/**
 * Procesa y almacena las memorias extraídas
 */
export async function processAndStoreExtractedMemories(
  userId: string,
  extractionResult: ExtractionResult
): Promise<void> {
  try {
    // Almacenar memorias semánticas
    const storePromises = extractionResult.memories.map(memory =>
      storeMemory(
        userId,
        memory.type,
        memory.content,
        memory.importanceScore,
        memory.metadata
      ).catch(err => {
        logger.warn(`[memory-extractor] Failed to store memory:`, err);
        return null;
      })
    );

    await Promise.all(storePromises);

    // Actualizar perfil de usuario
    if (extractionResult.profileUpdates) {
      await upsertUserProfile(userId, extractionResult.profileUpdates).catch(err => {
        logger.warn(`[memory-extractor] Failed to update profile:`, err);
      });
    }

    // Agregar reglas aprendidas
    if (extractionResult.learnedRules) {
      const rulePromises = extractionResult.learnedRules.map(rule =>
        addLearnedRule(userId, rule.condition, rule.action, rule.priority).catch(err => {
          logger.warn(`[memory-extractor] Failed to add learned rule:`, err);
          return null;
        })
      );

      await Promise.all(rulePromises);
    }

    logger.info(`[memory-extractor] Processed ${extractionResult.memories.length} memories for user ${userId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[memory-extractor] Error processing extracted memories:', error);
    // No lanzar error - esto es una operación en background
  }
}

/**
 * Extrae y almacena memorias de una conversación (función de conveniencia)
 */
export async function extractAndStoreMemories(
  userId: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    const extractionResult = await extractMemoriesFromConversation(userId, messages);
    await processAndStoreExtractedMemories(userId, extractionResult);
  } catch (error: unknown) {
    logger.error('[memory-extractor] Error in extractAndStoreMemories:', error);
    // No lanzar error - esto es una operación en background
  }
}

