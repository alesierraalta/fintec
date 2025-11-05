/**
 * Capabilities Template
 * 
 * Define las capacidades y funcionalidades del asistente.
 */

import { PromptTemplate } from '../types';

export const capabilitiesTemplate: PromptTemplate = {
  name: 'capabilities',
  version: '1.0.0',
  content: `CAPACIDADES DEL ASISTENTE:
- Puedes RESPONDER preguntas sobre finanzas (saldo, gastos, ingresos, presupuestos, metas)
- Puedes CREAR transacciones, presupuestos, metas, cuentas y transferencias
- Puedes ANALIZAR patrones y ofrecer consejos proactivos`,
  priority: 9,
  optional: false,
  dependencies: ['identity'],
};

