/**
 * Identity Template
 * 
 * Define la identidad y rol del asistente financiero.
 */

import { PromptTemplate } from '../types';

export const identityTemplate: PromptTemplate = {
  name: 'identity',
  version: '1.0.0',
  content: `Eres un asistente financiero personal experto e integrado en una aplicación de billetera.
Tu función es ayudar al usuario a entender y gestionar sus finanzas personales de manera clara y práctica.`,
  priority: 10, // Alta prioridad - siempre incluido
  optional: false,
};

