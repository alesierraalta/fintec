/**
 * Query Complexity Analyzer - Analiza la complejidad de queries para determinar top-K dinámico
 * 
 * Patrón: Service Layer
 * Principio SOLID: Single Responsibility (S)
 * 
 * Analiza queries de usuario para determinar su complejidad y sugerir
 * el número óptimo de documentos a recuperar (top-K).
 * 
 * MCP usado: serena para analizar patrones de intention-detector.ts
 */

import { logger } from '@/lib/utils/logger';

/**
 * Niveles de complejidad de query
 */
export type QueryComplexity = 'SIMPLE' | 'MODERATE' | 'COMPLEX';

/**
 * Analiza la complejidad de una query para determinar el top-K óptimo
 * 
 * @param query - Query del usuario
 * @returns Complejidad de la query (SIMPLE, MODERATE, COMPLEX)
 * 
 * Lógica:
 * - SIMPLE: Queries con límites explícitos (ej: "últimos 5 gastos") → topK = 5-10
 * - MODERATE: Queries con filtros (ej: "gastos de este mes") → topK = 10-15
 * - COMPLEX: Queries abiertas (ej: "analiza mis finanzas") → topK = 20-30
 */
export function analyzeQueryComplexity(query: string): QueryComplexity {
  const lowerQuery = query.toLowerCase().trim();
  
  // Patrones para queries SIMPLES (con límites explícitos)
  const simplePatterns = [
    // Límites numéricos explícitos
    /\b(?:últimas?|ultimas?|primeras?|primeros?|last|first|solo|only|just|exactamente|exactly)\s+(\d{1,2})\b/i,
    /\b(\d{1,2})\s+(?:últimas?|ultimas?|primeras?|primeros?|transacciones?|gastos?|ingresos?|items?|elementos?)\b/i,
    // Queries singulares ("el mayor", "mi mayor", "la mayor")
    /\b(?:el|la|mi|tu|su|nuestro|nuestra)\s+(?:mayor|menor|más\s+grande|más\s+pequeñ|mejor|peor)\b/i,
    // "top N"
    /\btop\s+(\d{1,2})\b/i,
  ];
  
  // Patrones para queries MODERATE (con filtros específicos)
  const moderatePatterns = [
    // Filtros temporales específicos
    /\b(?:este\s+mes|this\s+month|mes\s+pasado|last\s+month|esta\s+semana|this\s+week|semana\s+pasada|last\s+week)\b/i,
    // Filtros de tipo de transacción
    /\b(?:gastos?|expenses?|ingresos?|income)\s+(?:de|del|de la|this|last)\b/i,
    // Filtros de categoría
    /\b(?:categoría|categoria|category)\s+(?:de|del|de la|is|are)\b/i,
    // Filtros de cuenta
    /\b(?:cuenta|account)\s+(?:de|del|de la|is|are)\b/i,
    // Filtros de monto
    /\b(?:mayor|menor|más|menos)\s+(?:de|a|than)\s+\d+/i,
    // Rango de fechas
    /\b(?:desde|from)\s+.+\s+(?:hasta|to)\s+.+\b/i,
  ];
  
  // Patrones para queries COMPLEX (abiertas, analíticas)
  const complexPatterns = [
    // Queries analíticas
    /\b(?:analiza|analyze|análisis|analysis|resumen|summary|resume|overview|vista\s+general)\b/i,
    // Queries comparativas múltiples
    /\b(?:compara|compare|comparar|comparison)\s+.+\s+(?:con|with|y|and)\s+.+\b/i,
    // Queries de tendencias
    /\b(?:tendencia|trend|evolución|evolution|patrón|pattern|comportamiento|behavior)\b/i,
    // Queries de recomendaciones
    /\b(?:recomienda|recommend|sugiere|suggest|qué\s+debería|what\s+should|qué\s+me\s+conviene)\b/i,
    // Queries de predicción
    /\b(?:predice|predict|proyección|projection|forecast|pronóstico)\b/i,
    // Queries abiertas sin filtros específicos
    /\b(?:todo|all|todos|everything|toda\s+mi|all\s+my)\s+(?:información|information|datos|data|finanzas|finances)\b/i,
  ];
  
  // Verificar complejidad en orden: COMPLEX > MODERATE > SIMPLE
  // (una query puede tener múltiples características, priorizar la más compleja)
  
  // 1. Verificar si es COMPLEX
  const isComplex = complexPatterns.some(pattern => pattern.test(query));
  if (isComplex) {
    logger.debug(`[analyzeQueryComplexity] Query classified as COMPLEX: "${query.substring(0, 50)}..."`);
    return 'COMPLEX';
  }
  
  // 2. Verificar si es MODERATE
  const isModerate = moderatePatterns.some(pattern => pattern.test(query));
  if (isModerate) {
    logger.debug(`[analyzeQueryComplexity] Query classified as MODERATE: "${query.substring(0, 50)}..."`);
    return 'MODERATE';
  }
  
  // 3. Verificar si es SIMPLE
  const isSimple = simplePatterns.some(pattern => pattern.test(query));
  if (isSimple) {
    logger.debug(`[analyzeQueryComplexity] Query classified as SIMPLE: "${query.substring(0, 50)}..."`);
    return 'SIMPLE';
  }
  
  // 4. Por defecto, si no hay patrones claros, clasificar como MODERATE
  // (mejor recuperar más documentos que menos)
  logger.debug(`[analyzeQueryComplexity] Query classified as MODERATE (default): "${query.substring(0, 50)}..."`);
  return 'MODERATE';
}

/**
 * Calcula el top-K recomendado basado en la complejidad de la query
 * 
 * @param complexity - Complejidad de la query
 * @param explicitLimit - Límite explícito si existe en la query (opcional)
 * @returns Número recomendado de documentos a recuperar
 */
export function calculateTopK(complexity: QueryComplexity, explicitLimit?: number): number {
  // Si hay un límite explícito, usarlo (pero asegurar mínimo razonable)
  if (explicitLimit && explicitLimit > 0 && explicitLimit <= 100) {
    // Añadir un buffer del 20% para asegurar que tenemos suficientes resultados
    // después de filtrar por similitud
    const bufferedLimit = Math.ceil(explicitLimit * 1.2);
    return Math.min(bufferedLimit, 30); // Máximo 30 para queries simples
  }
  
  // Top-K basado en complejidad
  switch (complexity) {
    case 'SIMPLE':
      return 10; // Queries simples: 5-10 documentos
    case 'MODERATE':
      return 15; // Queries moderadas: 10-15 documentos
    case 'COMPLEX':
      return 25; // Queries complejas: 20-30 documentos
    default:
      return 15; // Default: MODERATE
  }
}

/**
 * Extrae límite explícito de la query (si existe)
 * Similar a extractLimit en intention-detector.ts pero simplificado
 * 
 * @param query - Query del usuario
 * @returns Límite numérico o null si no se encuentra
 */
export function extractExplicitLimit(query: string): number | null {
  const patterns = [
    // Patrones con palabras clave antes del número
    /(?:últimas?|ultimas?|last|primeras?|primeros?|first|solo|only|just|exactamente|exactly)\s+(\d+)/i,
    // Patrones con número antes de palabras clave
    /(\d+)\s+(?:últimas?|ultimas?|last|primeras?|primeros?|first|transacciones?|transactions?|gastos?|expenses?|ingresos?|income)/i,
    // Patrones con "dame/muestra/lista" + número
    /(?:dame|muestra|muéstrame|listar|lista|listado|show|give|tell)\s+(?:me|una|un)?\s*(?:lista\s+de\s+)?(?:mis|las|los|the)?\s*(?:últimas?|ultimas?|last)?\s*(\d+)/i,
    // Patrones con "top N"
    /\btop\s+(\d+)\b/i,
    // Patrón simple: cualquier número de 1-2 dígitos en contexto de consulta
    /\b(\d{1,2})\b/,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const limit = parseInt(match[1], 10);
      if (!isNaN(limit) && limit > 0 && limit <= 100) {
        // Si es el último patrón (fallback), verificar contexto
        if (pattern === patterns[patterns.length - 1]) {
          const hasQueryContext = /(?:transacciones?|gastos?|ingresos?|lista|muestra|dame|show|list)/i.test(query);
          if (!hasQueryContext) {
            continue; // Ignorar números sin contexto de consulta
          }
        }
        return limit;
      }
    }
  }
  
  return null;
}
