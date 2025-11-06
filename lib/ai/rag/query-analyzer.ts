/**
 * Query Complexity Analyzer
 */

import { logger } from '@/lib/utils/logger';

export type QueryComplexity = 'SIMPLE' | 'MODERATE' | 'COMPLEX';

export function analyzeQueryComplexity(query: string): QueryComplexity {
  const lowerQuery = query.toLowerCase().trim();
  
  const simplePatterns = [
    /\b(?:últimas?|ultimas?|primeras?|primeros?|last|first|solo|only|just|exactamente|exactly)\s+(\d{1,2})\b/i,
    /\b(\d{1,2})\s+(?:últimas?|ultimas?|primeras?|primeros?|transacciones?|gastos?|ingresos?|items?|elementos?)\b/i,
    /\b(?:el|la|mi|tu|su|nuestro|nuestra)\s+(?:mayor|menor|más\s+grande|más\s+pequeñ|mejor|peor)\b/i,
    /\btop\s+(\d{1,2})\b/i,
  ];
  
  const moderatePatterns = [
    /\b(?:este\s+mes|this\s+month|mes\s+pasado|last\s+month|esta\s+semana|this\s+week|semana\s+pasada|last\s+week)\b/i,
    /\b(?:gastos?|expenses?|ingresos?|income)\s+(?:de|del|de la|this|last)\b/i,
    /\b(?:categoría|categoria|category)\s+(?:de|del|de la|is|are)\b/i,
    /\b(?:cuenta|account)\s+(?:de|del|de la|is|are)\b/i,
    /\b(?:mayor|menor|más|menos)\s+(?:de|a|than)\s+\d+/i,
    /\b(?:desde|from)\s+.+\s+(?:hasta|to)\s+.+\b/i,
  ];
  
  const complexPatterns = [
    /\b(?:analiza|analyze|análisis|analysis|resumen|summary|resume|overview|vista\s+general)\b/i,
    /\b(?:compara|compare|comparar|comparison)\s+.+\s+(?:con|with|y|and)\s+.+\b/i,
    /\b(?:tendencia|trend|evolución|evolution|patrón|pattern|comportamiento|behavior)\b/i,
    /\b(?:recomienda|recommend|sugiere|suggest|qué\s+debería|what\s+should|qué\s+me\s+conviene)\b/i,
    /\b(?:predice|predict|proyección|projection|forecast|pronóstico)\b/i,
    /\b(?:todo|all|todos|everything|toda\s+mi|all\s+my)\s+(?:información|information|datos|data|finanzas|finances)\b/i,
  ];
  
  const isComplex = complexPatterns.some(pattern => pattern.test(query));
  if (isComplex) {
    logger.debug(`[analyzeQueryComplexity] Query classified as COMPLEX: "${query.substring(0, 50)}..."`);
    return 'COMPLEX';
  }
  
  const isModerate = moderatePatterns.some(pattern => pattern.test(query));
  if (isModerate) {
    logger.debug(`[analyzeQueryComplexity] Query classified as MODERATE: "${query.substring(0, 50)}..."`);
    return 'MODERATE';
  }
  
  const isSimple = simplePatterns.some(pattern => pattern.test(query));
  if (isSimple) {
    logger.debug(`[analyzeQueryComplexity] Query classified as SIMPLE: "${query.substring(0, 50)}..."`);
    return 'SIMPLE';
  }
  
  logger.debug(`[analyzeQueryComplexity] Query classified as MODERATE (default): "${query.substring(0, 50)}..."`);
  return 'MODERATE';
}

export function calculateTopK(complexity: QueryComplexity, explicitLimit?: number): number {
  if (explicitLimit && explicitLimit > 0 && explicitLimit <= 100) {
    const bufferedLimit = Math.ceil(explicitLimit * 1.2);
    return Math.min(bufferedLimit, 30);
  }
  
  switch (complexity) {
    case 'SIMPLE':
      return 10;
    case 'MODERATE':
      return 15;
    case 'COMPLEX':
      return 25;
    default:
      return 15;
  }
}

export function extractExplicitLimit(query: string): number | null {
  const patterns = [
    /(?:últimas?|ultimas?|last|primeras?|primeros?|first|solo|only|just|exactamente|exactly)\s+(\d+)/i,
    /(\d+)\s+(?:últimas?|ultimas?|last|primeras?|primeros?|first|transacciones?|transactions?|gastos?|expenses?|ingresos?|income)/i,
    /(?:dame|muestra|muéstrame|listar|lista|listado|show|give|tell)\s+(?:me|una|un)?\s*(?:lista\s+de\s+)?(?:mis|las|los|the)?\s*(?:últimas?|ultimas?|last)?\s*(\d+)/i,
    /\btop\s+(\d+)\b/i,
    /\b(\d{1,2})\b/,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const limit = parseInt(match[1], 10);
      if (!isNaN(limit) && limit > 0 && limit <= 100) {
        if (pattern === patterns[patterns.length - 1]) {
          const hasQueryContext = /(?:transacciones?|gastos?|ingresos?|lista|muestra|dame|show|list)/i.test(query);
          if (!hasQueryContext) {
            continue;
          }
        }
        return limit;
      }
    }
  }
  
  return null;
}
