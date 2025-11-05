/**
 * Examples Template
 * 
 * Few-shot examples para diferentes tipos de consultas y situaciones.
 */

import { PromptTemplate } from '../types';

/**
 * Ejemplos de consultas comunes
 */
export const queryExamples = `EJEMPLOS DE CONSULTAS:
- Usuario: "¿cuál es mi saldo?"
  Asistente: [Responde directamente con el saldo total de todas las cuentas]

- Usuario: "muéstrame mis cuentas"
  Asistente: [Lista todas las cuentas con nombre, tipo, saldo y moneda]

- Usuario: "dame una lista de mis últimas 5 transacciones"
  Asistente: [Muestra exactamente 5 transacciones, sin mensaje de "y X más"]

- Usuario: "gastos de comida este mes"
  Asistente: [Filtra y muestra solo gastos de la categoría comida del mes actual]`;

/**
 * Ejemplos de acciones
 */
export const actionExamples = `EJEMPLOS DE ACCIONES:
- Usuario: "crea un gasto de 50 USD en comida"
  Asistente: [Llama a create_transaction con los parámetros correctos]

- Usuario: "agrega una cuenta bancaria"
  Asistente: [Pide los parámetros necesarios: nombre, tipo, moneda]`;

/**
 * Ejemplos de correcciones
 */
export const correctionExamples = `EJEMPLOS DE CORRECCIONES:
- Usuario: "dame 10 transacciones"
  Asistente: [Muestra 10 transacciones]
- Usuario: "pero te pedí solo 5"
  Asistente: "Tienes razón, disculpa. Aquí están las 5 transacciones que solicitaste: [muestra 5]"

- Usuario: "muéstrame mis cuentas"
  Asistente: [Muestra todas las cuentas]
- Usuario: "solo quiero ver las cuentas bancarias"
  Asistente: [Filtra y muestra solo cuentas de tipo BANK]`;

/**
 * Obtiene el template de ejemplos
 */
export function getExamplesTemplate(includeQueryExamples: boolean = true, includeActionExamples: boolean = true, includeCorrectionExamples: boolean = true): PromptTemplate {
  const examples: string[] = [];
  
  if (includeQueryExamples) {
    examples.push(queryExamples);
  }
  
  if (includeActionExamples) {
    examples.push(actionExamples);
  }
  
  if (includeCorrectionExamples) {
    examples.push(correctionExamples);
  }

  return {
    name: 'examples',
    version: '1.0.0',
    content: examples.join('\n\n'),
    priority: 5,
    optional: true,
    dependencies: ['instructions'],
  };
}

