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
export const actionExamples = `EJEMPLOS DE ACCIONES (EJECUTAR AUTOMÁTICAMENTE):
- Usuario: "crea un gasto de 50 USD en comida"
  Asistente: [Ejecuta automáticamente create_transaction con amount: 50, currency: "USD", type: "EXPENSE", description: "comida", category: "Comida"]

- Usuario: "haz esta transacción: compré un libro en Amazon por 25 USD"
  Asistente: [Ejecuta automáticamente create_transaction con amount: 25, currency: "USD", type: "EXPENSE", description: "libro en Amazon", category: "Compras"]

- Usuario: "registra: gasté 30 USD en gasolina"
  Asistente: [Ejecuta automáticamente create_transaction con amount: 30, currency: "USD", type: "EXPENSE", description: "gasolina", category: "Transporte"]

- Usuario: "compré comida en el supermercado por 45 USD"
  Asistente: [Ejecuta automáticamente create_transaction con amount: 45, currency: "USD", type: "EXPENSE", description: "comida en el supermercado", category: "Comida"]

- Usuario: "gasté 20 USD en el cine"
  Asistente: [Ejecuta automáticamente create_transaction con amount: 20, currency: "USD", type: "EXPENSE", description: "cine", category: "Entretenimiento"]

- Usuario: "pagué 15 USD por un taxi"
  Asistente: [Ejecuta automáticamente create_transaction con amount: 15, currency: "USD", type: "EXPENSE", description: "taxi", category: "Transporte"]

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
 * Ejemplos de análisis (ejecución automática)
 */
export const analysisExamples = `EJEMPLOS DE ANÁLISIS (EJECUTAR AUTOMÁTICAMENTE):
- Usuario: "¿cuál es mi porcentaje de gasto mensual?"
  Asistente: [Ejecuta automáticamente analyze_spending(period: "month") y presenta resultados con porcentajes]
  Respuesta: "Tu porcentaje de gasto mensual es del 75%. Gastaste $1,500 de $2,000 en ingresos. Tu tasa de ahorro es del 25%."

- Usuario: "analiza mis gastos por categoría"
  Asistente: [Ejecuta automáticamente analyze_by_category(period: "month")]
  Respuesta: "Análisis de gastos por categoría este mes:
  • Comida: $500 (33.3%)
  • Transporte: $300 (20%)
  • Entretenimiento: $200 (13.3%)
  • Otros: $500 (33.3%)
  Total: $1,500"

- Usuario: "comparar este mes con el anterior"
  Asistente: [Ejecuta automáticamente compare_periods(currentPeriod: "month")]
  Respuesta: "Comparación de períodos:
  Este mes: Ingresos $2,000, Gastos $1,500, Ahorro $500
  Mes anterior: Ingresos $1,800, Gastos $1,600, Ahorro $200
  Tendencia: Ingresos +11.1%, Gastos -6.3%, Ahorro +150%"

- Usuario: "dame un resumen financiero"
  Asistente: [Ejecuta automáticamente get_financial_summary(period: "month", includeTrends: true)]
  Respuesta: "Resumen financiero del mes:
  • Ingresos: $2,000
  • Gastos: $1,500
  • Ahorro: $500 (25%)
  • Ratio de gasto: 75%
  • Cuentas activas: 3
  • Presupuestos activos: 2
  • Metas activas: 1
  Tendencia: Mejora del 11% vs mes anterior"`;

/**
 * Obtiene el template de ejemplos
 */
export function getExamplesTemplate(
  includeQueryExamples: boolean = true, 
  includeActionExamples: boolean = true, 
  includeCorrectionExamples: boolean = true,
  includeAnalysisExamples: boolean = true
): PromptTemplate {
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
  
  if (includeAnalysisExamples) {
    examples.push(analysisExamples);
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

