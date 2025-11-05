/**
 * Proactive Advisor for AI Assistant
 * 
 * Analiza el contexto financiero para detectar oportunidades y sugerir acciones proactivas.
 * Genera alertas y recomendaciones basadas en patrones detectados.
 */

import { WalletContext } from './context-builder';
import { logger } from '@/lib/utils/logger';

export interface ProactiveSuggestion {
  type: 'BUDGET_WARNING' | 'BUDGET_EXCEEDED' | 'GOAL_PROGRESS' | 'SPENDING_PATTERN' | 'LOW_BALANCE' | 'INACTIVE_ACCOUNT';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action?: {
    type: string;
    label: string;
    parameters?: Record<string, any>;
  };
}

/**
 * Analiza el contexto y genera sugerencias proactivas
 */
export function generateProactiveSuggestions(context: WalletContext): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // Analizar presupuestos
  suggestions.push(...analyzeBudgets(context));

  // Analizar metas
  suggestions.push(...analyzeGoals(context));

  // Analizar patrones de gasto
  suggestions.push(...analyzeSpendingPatterns(context));

  // Analizar cuentas
  suggestions.push(...analyzeAccounts(context));

  // Ordenar por prioridad
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

/**
 * Analiza presupuestos y genera sugerencias
 */
function analyzeBudgets(context: WalletContext): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  for (const budget of context.budgets.active) {
    // Presupuesto excedido
    if (budget.percentage > 100) {
      suggestions.push({
        type: 'BUDGET_EXCEEDED',
        priority: 'high',
        title: `⚠️ Presupuesto excedido: ${budget.category}`,
        message: `Has excedido tu presupuesto de ${budget.category} en ${(budget.spent - budget.budget).toFixed(2)} USD. Considera ajustar el presupuesto o reducir gastos en esta categoría.`,
        action: {
          type: 'UPDATE_BUDGET',
          label: 'Ajustar presupuesto',
          parameters: {
            category: budget.category,
            currentAmount: budget.budget,
            spent: budget.spent,
          },
        },
      });
    }
    // Presupuesto cerca del límite (80-100%)
    else if (budget.percentage >= 80 && budget.percentage <= 100) {
      suggestions.push({
        type: 'BUDGET_WARNING',
        priority: 'medium',
        title: `📊 Presupuesto cerca del límite: ${budget.category}`,
        message: `Tu presupuesto de ${budget.category} está al ${budget.percentage}% (${budget.spent.toFixed(2)} USD de ${budget.budget.toFixed(2)} USD). Te quedan ${budget.remaining.toFixed(2)} USD disponibles.`,
        action: {
          type: 'QUERY_TRANSACTIONS',
          label: 'Ver gastos',
          parameters: {
            category: budget.category,
          },
        },
      });
    }
  }

  // Si no hay presupuestos pero hay gastos significativos
  if (context.budgets.active.length === 0 && context.transactions.summary.expensesThisMonth > 0) {
    const topCategory = context.transactions.summary.topCategories[0];
    if (topCategory && topCategory.amount > 100) {
      suggestions.push({
        type: 'SPENDING_PATTERN',
        priority: 'medium',
        title: `💡 Sugerencia: Crear presupuesto para ${topCategory.category}`,
        message: `Gastas ${topCategory.amount.toFixed(2)} USD al mes en ${topCategory.category}. ¿Quieres crear un presupuesto para controlar mejor estos gastos?`,
        action: {
          type: 'CREATE_BUDGET',
          label: 'Crear presupuesto',
          parameters: {
            category: topCategory.category,
            suggestedAmount: topCategory.amount * 1.1, // 10% más que el gasto actual
          },
        },
      });
    }
  }

  return suggestions;
}

/**
 * Analiza metas y genera sugerencias
 */
function analyzeGoals(context: WalletContext): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  for (const goal of context.goals.active) {
    // Meta cerca de completarse (80-100%)
    if (goal.progress >= 80 && goal.progress < 100) {
      suggestions.push({
        type: 'GOAL_PROGRESS',
        priority: 'high',
        title: `🎯 ¡Casi lo logras! ${goal.name}`,
        message: `Tu meta "${goal.name}" está al ${goal.progress}% (${goal.current.toFixed(2)} USD de ${goal.target.toFixed(2)} USD). ¡Faltan solo ${(goal.target - goal.current).toFixed(2)} USD!`,
      });
    }
    // Meta con buen progreso (50-80%)
    else if (goal.progress >= 50 && goal.progress < 80) {
      suggestions.push({
        type: 'GOAL_PROGRESS',
        priority: 'medium',
        title: `📈 Buen progreso: ${goal.name}`,
        message: `Tu meta "${goal.name}" está al ${goal.progress}% completada. ¡Sigue así!`,
      });
    }
    // Meta con poco progreso y fecha cerca
    else if (goal.progress < 50 && goal.targetDate) {
      const targetDate = new Date(goal.targetDate);
      const today = new Date();
      const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining > 0 && daysRemaining <= 30) {
        const neededPerDay = (goal.target - goal.current) / daysRemaining;
        suggestions.push({
          type: 'GOAL_PROGRESS',
          priority: 'high',
          title: `⏰ Fecha objetivo cerca: ${goal.name}`,
          message: `Tu meta "${goal.name}" está al ${goal.progress}% y la fecha objetivo es en ${daysRemaining} días. Necesitas ahorrar ${neededPerDay.toFixed(2)} USD por día para alcanzarla.`,
        });
      }
    }
  }

  // Si no hay metas pero hay buen flujo de ingresos
  if (context.goals.active.length === 0 && context.transactions.summary.netThisMonth > 500) {
    suggestions.push({
      type: 'GOAL_PROGRESS',
      priority: 'low',
      title: `💡 Sugerencia: Establecer una meta de ahorro`,
      message: `Tienes un flujo positivo de ${context.transactions.summary.netThisMonth.toFixed(2)} USD este mes. ¿Quieres crear una meta de ahorro para aprovechar esto?`,
      action: {
        type: 'CREATE_GOAL',
        label: 'Crear meta',
        parameters: {
          suggestedTarget: context.transactions.summary.netThisMonth * 3, // 3 meses de ahorro
        },
      },
    });
  }

  return suggestions;
}

/**
 * Analiza patrones de gasto y genera sugerencias
 */
function analyzeSpendingPatterns(context: WalletContext): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // Si hay muchas transacciones en una categoría
  const topCategory = context.transactions.summary.topCategories[0];
  if (topCategory && topCategory.count >= 10 && topCategory.amount > 200) {
    suggestions.push({
      type: 'SPENDING_PATTERN',
      priority: 'medium',
      title: `📊 Patrón de gasto detectado: ${topCategory.category}`,
      message: `Has realizado ${topCategory.count} transacciones en ${topCategory.category} este mes, totalizando ${topCategory.amount.toFixed(2)} USD. Considera crear un presupuesto para esta categoría.`,
      action: {
        type: 'CREATE_BUDGET',
        label: 'Crear presupuesto',
        parameters: {
          category: topCategory.category,
          suggestedAmount: topCategory.amount * 1.2,
        },
      },
    });
  }

  // Si los gastos superan significativamente los ingresos
  const expenseRatio = context.transactions.summary.incomeThisMonth > 0
    ? context.transactions.summary.expensesThisMonth / context.transactions.summary.incomeThisMonth
    : 0;

  if (expenseRatio > 0.9 && expenseRatio < 1.0) {
    suggestions.push({
      type: 'SPENDING_PATTERN',
      priority: 'high',
      title: `⚠️ Gastos cerca de ingresos`,
      message: `Tus gastos este mes (${context.transactions.summary.expensesThisMonth.toFixed(2)} USD) representan el ${(expenseRatio * 100).toFixed(0)}% de tus ingresos (${context.transactions.summary.incomeThisMonth.toFixed(2)} USD). Considera reducir gastos o aumentar ingresos.`,
    });
  } else if (expenseRatio >= 1.0) {
    suggestions.push({
      type: 'SPENDING_PATTERN',
      priority: 'high',
      title: `🚨 Gastos superan ingresos`,
      message: `Tus gastos este mes (${context.transactions.summary.expensesThisMonth.toFixed(2)} USD) superan tus ingresos (${context.transactions.summary.incomeThisMonth.toFixed(2)} USD) en ${(context.transactions.summary.expensesThisMonth - context.transactions.summary.incomeThisMonth).toFixed(2)} USD. Revisa tus gastos para evitar problemas financieros.`,
    });
  }

  return suggestions;
}

/**
 * Analiza cuentas y genera sugerencias
 */
function analyzeAccounts(context: WalletContext): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // Cuentas con balance muy bajo
  for (const account of context.accounts.summary) {
    if (account.balance < 10 && account.type !== 'CASH') {
      suggestions.push({
        type: 'LOW_BALANCE',
        priority: 'medium',
        title: `💰 Balance bajo: ${account.name}`,
        message: `La cuenta "${account.name}" tiene un balance muy bajo (${account.balance.toFixed(2)} ${account.currency}). Considera recargarla o revisar tus gastos.`,
      });
    }
  }

  // Si hay muchas cuentas con balance cero
  const zeroBalanceAccounts = context.accounts.summary.filter(acc => acc.balance === 0);
  if (zeroBalanceAccounts.length > 0 && zeroBalanceAccounts.length < context.accounts.total) {
    suggestions.push({
      type: 'INACTIVE_ACCOUNT',
      priority: 'low',
      title: `📋 Cuentas inactivas`,
      message: `Tienes ${zeroBalanceAccounts.length} cuenta(s) con balance cero: ${zeroBalanceAccounts.map(acc => acc.name).join(', ')}. Considera consolidar o eliminar cuentas que no uses.`,
    });
  }

  return suggestions;
}

/**
 * Genera mensaje de sugerencia proactiva para el prompt del sistema
 */
export function generateProactivePrompt(context: WalletContext): string {
  const suggestions = generateProactiveSuggestions(context);
  
  if (suggestions.length === 0) {
    return '';
  }

  // Filtrar solo sugerencias de alta prioridad para el prompt
  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
  
  if (highPrioritySuggestions.length === 0) {
    return '';
  }

  const suggestionsText = highPrioritySuggestions
    .slice(0, 3) // Máximo 3 sugerencias
    .map(s => `- ${s.title}: ${s.message}`)
    .join('\n');

  return `\n\nSUGERENCIAS PROACTIVAS (puedes mencionarlas si es relevante):\n${suggestionsText}\n\nPuedes ofrecer realizar estas acciones si el usuario está interesado.`;
}


