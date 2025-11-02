/**
 * Fallback Responses for AI Chat
 * 
 * Respuestas predefinidas basadas en palabras clave e intenciones comunes.
 * Se usa cuando la IA falla (timeout, error, etc.).
 * Integra datos reales del contexto de billetera.
 */

import { WalletContext } from './context-builder';
import { logger } from '@/lib/utils/logger';

interface IntentionMatch {
  score: number; // 0-1, qué tan bien coincide
  category: string;
}

/**
 * Mapeo de palabras clave a intenciones
 */
const INTENTION_KEYWORDS: Record<string, string[]> = {
  greeting: ['hola', 'buenos', 'buenas', 'qué tal', 'cómo estás', 'hey', 'hi', 'hello'],
  balance: ['saldo', 'balance', 'tengo', 'cuánto', 'total', 'cuenta', 'dinero'],
  expenses: ['gastos', 'gastado', 'gasto', 'consumo', 'salida', 'egreso', 'dinero gastado'],
  income: ['ingresos', 'ingreso', 'entrada', 'ganancia', 'recibido', 'cobrado'],
  budget: ['presupuesto', 'presupuestos', 'límite de gasto', 'gastó', 'presupuestal'],
  goals: ['meta', 'metas', 'objetivo', 'objetivos', 'ahorro', 'ahorrar'],
  spending_patterns: ['patrón', 'hábitos', 'tendencia', 'categoría', 'categorías', 'dónde gasto'],
  help: ['ayuda', 'help', 'qué puedes', 'cómo funciona', 'qué haces', 'puedes hacer'],
  error: ['error', 'problema', 'no funciona', 'fallo', 'no puedo'],
};

/**
 * Respuestas predefinidas por intención
 */
const FALLBACK_RESPONSES: Record<string, (context: WalletContext) => string> = {
  greeting: (context) => {
    const hasData = context.accounts.total > 0;
    if (hasData) {
      return `¡Hola! Soy tu asistente financiero. Tengo acceso a tu información financiera actual. Puedo ayudarte con tus saldos, gastos, presupuestos y metas. ¿En qué te puedo ayudar?`;
    }
    return `¡Hola! Soy tu asistente financiero. Para poder ayudarte mejor, necesitas agregar al menos una cuenta a tu billetera.`;
  },

  balance: (context) => {
    if (context.accounts.total === 0) {
      return 'No tienes cuentas registradas aún. Agrega una cuenta para que pueda ayudarte a monitorear tu saldo.';
    }

    const balances = Object.entries(context.accounts.totalBalance)
      .map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`)
      .join(', ');

    return `Tu saldo total es: ${balances} distribuido en ${context.accounts.total} cuenta(s). ¿Quieres detalles de alguna cuenta específica?`;
  },

  expenses: (context) => {
    if (context.transactions.recent.length === 0) {
      return 'No tienes transacciones registradas aún.';
    }

    const { expensesThisMonth } = context.transactions.summary;
    const topExpenses = context.transactions.summary.topCategories.slice(0, 3);

    let response = `Este mes has gastado ${expensesThisMonth.toFixed(2)} USD.`;

    if (topExpenses.length > 0) {
      response += ` Tus principales gastos son: ${topExpenses.map(c => `${c.category} (${c.amount.toFixed(2)} USD)`).join(', ')}.`;
    }

    return response;
  },

  income: (context) => {
    if (context.transactions.recent.length === 0) {
      return 'No tienes transacciones de ingreso registradas.';
    }

    const { incomeThisMonth } = context.transactions.summary;
    return `Este mes has recibido ${incomeThisMonth.toFixed(2)} USD.`;
  },

  budget: (context) => {
    if (context.budgets.active.length === 0) {
      return 'No tienes presupuestos activos. Crear un presupuesto te ayudará a controlar tus gastos en categorías específicas.';
    }

    const exceedingBudgets = context.budgets.active.filter(b => b.percentage > 100);
    const warningBudgets = context.budgets.active.filter(b => b.percentage >= 80 && b.percentage <= 100);

    let response = '';

    if (exceedingBudgets.length > 0) {
      response += `⚠️ Has excedido tus presupuestos en: ${exceedingBudgets.map(b => b.category).join(', ')}.`;
    }

    if (warningBudgets.length > 0) {
      response += `${response ? ' ' : ''}Estás cerca del límite en: ${warningBudgets.map(b => b.category).join(', ')}.`;
    }

    if (!response) {
      response = `Tienes ${context.budgets.active.length} presupuesto(s) activo(s). Todos están dentro del límite.`;
    }

    return response;
  },

  goals: (context) => {
    if (context.goals.active.length === 0) {
      return 'No tienes metas de ahorro activas. Establecer metas puede ayudarte a ahorrar de forma más enfocada.';
    }

    const goalsProgress = context.goals.active
      .map(g => `${g.name}: ${g.progress.toFixed(0)}% completado`)
      .join(', ');

    return `Tus metas: ${goalsProgress}. ¡Sigue adelante!`;
  },

  spending_patterns: (context) => {
    if (context.transactions.summary.topCategories.length === 0) {
      return 'No tengo suficientes datos para analizar patrones de gasto.';
    }

    const topCategory = context.transactions.summary.topCategories[0];
    const response = `Tu categoría principal de gasto es ${topCategory.category} con ${topCategory.amount.toFixed(2)} USD en ${topCategory.count} transacciones.`;
    
    return response;
  },

  help: (context) => {
    return `Puedo ayudarte con:
• Consultar tu saldo y cuentas
• Ver tus gastos e ingresos
• Revisar tus presupuestos
• Monitorear tus metas de ahorro
• Analizar patrones de gasto

¿Sobre qué quieres saber más?`;
  },

  error: (context) => {
    return `Parece que tuve un problema al procesar tu solicitud. Por favor intenta de nuevo con una pregunta diferente. Estoy aquí para ayudarte con tus finanzas. 😊`;
  },

  default: (context) => {
    return `No estoy seguro cómo ayudarte con eso. Puedo responder preguntas sobre tu saldo, gastos, presupuestos y metas. ¿Hay algo en específico que quieras saber?`;
  },
};

/**
 * Detecta la intención del mensaje del usuario
 */
function detectIntention(message: string): IntentionMatch {
  const lowerMessage = message.toLowerCase();
  const scores: Record<string, number> = {};

  // Calcular score para cada intención basado en coincidencia de palabras clave
  for (const [intention, keywords] of Object.entries(INTENTION_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        score += 1;
      }
    }
    scores[intention] = score / keywords.length;
  }

  // Encontrar la intención con el mayor score
  let maxScore = 0;
  let bestIntention = 'default';

  for (const [intention, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestIntention = intention;
    }
  }

  // Si el score es muy bajo (< 0.1), considerar como default
  const threshold = 0.1;
  if (maxScore < threshold) {
    return { score: 0, category: 'default' };
  }

  return { score: maxScore, category: bestIntention };
}

/**
 * Obtiene una respuesta fallback basada en el mensaje del usuario y contexto
 */
export function getFallbackResponse(userMessage: string, context: WalletContext): string {
  try {
    const intention = detectIntention(userMessage);
    const responseGenerator = FALLBACK_RESPONSES[intention.category] || FALLBACK_RESPONSES.default;
    
    const response = responseGenerator(context);
    
    logger.info(
      `Fallback response triggered. Intention: ${intention.category}, Score: ${intention.score.toFixed(2)}`
    );

    return response;
  } catch (error) {
    logger.error('Error generating fallback response', error);
    return FALLBACK_RESPONSES.error(context);
  }
}

/**
 * Obtiene intención sin generar respuesta (para debugging)
 */
export function detectMessageIntention(userMessage: string): string {
  return detectIntention(userMessage).category;
}
