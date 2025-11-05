/**
 * Prompt Management System - Types
 * 
 * Definiciones de tipos para el sistema modular de gestión de prompts.
 */

/**
 * Componentes modulares de un prompt
 */
export type PromptComponent = 
  | 'identity'      // Identidad del asistente
  | 'capabilities'  // Capacidades y funcionalidades
  | 'instructions'  // Instrucciones críticas
  | 'context'       // Contexto dinámico
  | 'examples'      // Few-shot examples
  | 'system';       // Prompt base del sistema

/**
 * Configuración para composición de prompts
 */
export interface PromptCompositionConfig {
  /**
   * Componentes a incluir en el prompt
   */
  components: PromptComponent[];
  
  /**
   * Contexto del usuario para personalización
   */
  userContext?: {
    userId?: string;
    hasAccounts?: boolean;
    hasTransactions?: boolean;
    hasBudgets?: boolean;
    hasGoals?: boolean;
  };
  
  /**
   * Opciones de optimización
   */
  options?: {
    /**
     * Incluir solo instrucciones relevantes al contexto
     */
    includeOnlyRelevant?: boolean;
    
    /**
     * Eliminar duplicados de contenido
     */
    removeDuplicates?: boolean;
    
    /**
     * Incluir few-shot examples
     */
    includeExamples?: boolean;
    
    /**
     * Versión del prompt a usar
     */
    version?: string;
  };
}

/**
 * Template de prompt modular
 */
export interface PromptTemplate {
  /**
   * Nombre del componente
   */
  name: PromptComponent;
  
  /**
   * Versión del template
   */
  version: string;
  
  /**
   * Contenido del template (puede incluir placeholders)
   */
  content: string;
  
  /**
   * Variables requeridas para el template
   */
  requiredVariables?: string[];
  
  /**
   * Dependencias de otros componentes
   */
  dependencies?: PromptComponent[];
  
  /**
   * Prioridad de inclusión (mayor = más importante)
   */
  priority?: number;
  
  /**
   * Si este componente es opcional
   */
  optional?: boolean;
}

/**
 * Prompt compuesto listo para usar
 */
export interface ComposedPrompt {
  /**
   * Prompt final compuesto
   */
  content: string;
  
  /**
   * Componentes incluidos
   */
  components: PromptComponent[];
  
  /**
   * Versión utilizada
   */
  version: string;
  
  /**
   * Token count estimado (si está disponible)
   */
  estimatedTokens?: number;
  
  /**
   * Timestamp de creación
   */
  timestamp: number;
}

/**
 * Resultado de caché de prompt
 */
export interface CachedPrompt {
  /**
   * Prompt compuesto
   */
  prompt: ComposedPrompt;
  
  /**
   * Clave de caché
   */
  cacheKey: string;
  
  /**
   * TTL en segundos
   */
  ttl: number;
  
  /**
   * Timestamp de creación
   */
  createdAt: number;
}

/**
 * Métricas de uso de prompts
 */
export interface PromptMetrics {
  /**
   * ID del prompt
   */
  promptId: string;
  
  /**
   * Número de veces usado
   */
  usageCount: number;
  
  /**
   * Tokens promedio consumidos
   */
  averageTokens: number;
  
  /**
   * Última vez usado
   */
  lastUsed: number;
  
  /**
   * Tasa de éxito (si está disponible)
   */
  successRate?: number;
}

/**
 * Configuración de versionado
 */
export interface PromptVersion {
  /**
   * ID de la versión
   */
  versionId: string;
  
  /**
   * Componente al que pertenece
   */
  component: PromptComponent;
  
  /**
   * Contenido de la versión
   */
  content: string;
  
  /**
   * Si es la versión activa
   */
  isActive: boolean;
  
  /**
   * Fecha de creación
   */
  createdAt: number;
  
  /**
   * Descripción de cambios
   */
  changelog?: string;
}

