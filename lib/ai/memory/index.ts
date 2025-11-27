/**
 * Memory System - API Unificada para todas las capas de memoria
 * 
 * Proporciona una interfaz unificada para acceder a:
 * - Memoria episódica (conversaciones históricas)
 * - Memoria semántica (hechos y preferencias)
 * - Memoria procedimental (perfil de usuario)
 * - Memoria a corto plazo (caché mejorado)
 */

// Exportar todos los módulos de memoria
export * from './episodic-memory';
export * from './semantic-memory';
export * from './procedural-memory';
export * from './memory-extractor';
export * from './memory-retriever';
export * from './memory-consolidator';
export * from './short-term-memory';

// Re-exportar tipos comunes
export type { ChatMessage } from '../chat-assistant';

