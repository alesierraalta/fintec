/**
 * System Template
 * 
 * Template base que compone el system prompt completo.
 * Este template coordina la composición de todos los demás templates.
 */

import { PromptTemplate } from '../types';

/**
 * Template base del sistema
 * Nota: Este template se usa principalmente como coordinador.
 * La composición real se hace en PromptManager.
 */
export const systemTemplate: PromptTemplate = {
  name: 'system',
  version: '1.0.0',
  content: '', // Se compone dinámicamente en PromptManager
  priority: 1,
  optional: false,
  dependencies: ['identity', 'capabilities', 'instructions', 'context'],
};

