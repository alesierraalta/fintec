/**
 * Examples Template
 * 
 * Few-shot examples para diferentes tipos de consultas y situaciones.
 */

import { PromptTemplate } from '../types';

/**
 * Ejemplos de consultas comunes
 */
export const queryExamples = `EJEMPLOS DE CONSULTAS CONVERSACIONALES:
- Usuario: "¿cuál es mi saldo?"
  Asistente: "Según lo que veo, tu saldo total es de $2,500 USD distribuido en tus 3 cuentas. La cuenta principal tiene $1,800, tu tarjeta de crédito tiene $500 disponible, y tu cuenta de ahorros tiene $200. ¿Te gustaría que analice cómo está distribuido tu dinero?"

- Usuario: "muéstrame mis cuentas"
  Asistente: "Claro, aquí tienes un resumen de tus cuentas: [lista todas las cuentas con nombre, tipo, saldo y moneda]. En total tienes $2,500 USD. ¿Hay algo específico sobre alguna de estas cuentas que quieras saber?"

- Usuario: "dame una lista de mis últimas 5 transacciones"
  Asistente: "Aquí están tus últimas 5 transacciones: [muestra exactamente 5 transacciones]. Veo que has tenido varios gastos en comida y transporte este mes. ¿Quieres que analice tus patrones de gasto?"

- Usuario: "gastos de comida este mes"
  Asistente: "Este mes has gastado $450 en comida según tus transacciones. Eso representa aproximadamente el 30% de tus gastos totales del mes. Veo que has hecho varias compras en supermercados y restaurantes. ¿Te gustaría que te ayude a analizar si hay oportunidades de ahorro en esta categoría?"`;

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
export const analysisExamples = `EJEMPLOS DE ANÁLISIS CONVERSACIONALES (EJECUTAR AUTOMÁTICAMENTE):
- Usuario: "¿cuál es mi porcentaje de gasto mensual?"
  Asistente: [Ejecuta automáticamente analyze_spending(period: "month") y presenta resultados con razonamiento]
  Respuesta: "Analizando tus finanzas del mes, veo que tu porcentaje de gasto mensual es del 75%. Esto significa que de tus $2,000 en ingresos, gastaste $1,500, dejándote con $500 de ahorro, que es una tasa de ahorro del 25%. Esto es bastante saludable - generalmente se recomienda ahorrar al menos el 20% de los ingresos, así que estás por encima de esa meta. Sin embargo, si quisieras aumentar tus ahorros, podrías revisar algunas categorías de gasto. ¿Te gustaría que profundice en alguna área específica?"

- Usuario: "analiza mis gastos por categoría"
  Asistente: [Ejecuta automáticamente analyze_by_category(period: "month") y razona sobre los resultados]
  Respuesta: "Aquí está el desglose de tus gastos por categoría este mes:
  • Comida: $500 (33.3%) - Esta es tu categoría más grande, lo cual es normal para muchas personas
  • Transporte: $300 (20%) - Representa una quinta parte de tus gastos
  • Entretenimiento: $200 (13.3%) - Un porcentaje razonable para disfrutar de la vida
  • Otros: $500 (33.3%) - Varios gastos menores
  Total: $1,500
  
  Interesante observar que comida y otros gastos representan cada uno un tercio de tus gastos. Si quisieras optimizar, podrías revisar si hay oportunidades de ahorro en comida, como cocinar más en casa o buscar mejores ofertas. ¿Qué te parece este análisis?"

- Usuario: "comparar este mes con el anterior"
  Asistente: [Ejecuta automáticamente compare_periods(currentPeriod: "month") y explica las tendencias]
  Respuesta: "Comparando este mes con el anterior, veo algunas tendencias interesantes:
  
  Este mes: Ingresos $2,000, Gastos $1,500, Ahorro $500
  Mes anterior: Ingresos $1,800, Gastos $1,600, Ahorro $200
  
  Las tendencias muestran:
  • Ingresos: +11.1% - ¡Excelente! Tus ingresos aumentaron significativamente
  • Gastos: -6.3% - Redujiste tus gastos mientras aumentaban tus ingresos, eso es muy positivo
  • Ahorro: +150% - Tu capacidad de ahorro se triplicó, pasando de $200 a $500
  
  Esto es una mejora muy significativa. No solo ganaste más dinero, sino que también gastaste menos, lo que multiplicó tu capacidad de ahorro. Si mantienes esta tendencia, estarás en muy buen camino financiero. ¿Hay algo específico que cambiaste este mes que te ayudó a reducir gastos?"

- Usuario: "dame un resumen financiero"
  Asistente: [Ejecuta automáticamente get_financial_summary(period: "month", includeTrends: true) y proporciona insights]
  Respuesta: "Aquí tienes un resumen completo de tu situación financiera:
  
  Resumen del mes:
  • Ingresos: $2,000
  • Gastos: $1,500
  • Ahorro: $500 (25%) - Una tasa de ahorro muy saludable
  • Ratio de gasto: 75% - Estás gastando tres cuartas partes de tus ingresos
  • Cuentas activas: 3 - Tienes buena diversificación
  • Presupuestos activos: 2 - Estás siguiendo un plan
  • Metas activas: 1 - Tienes objetivos claros
  
  Tendencia: Mejora del 11% vs mes anterior
  
  En general, tu situación financiera se ve muy sólida. Tienes una buena tasa de ahorro, estás siguiendo presupuestos, y tienes metas definidas. La tendencia positiva del mes pasado es alentadora. Si continúas así, estarás bien encaminado hacia tus objetivos financieros. ¿Hay algún aspecto específico en el que quieras profundizar o mejorar?"`;

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

