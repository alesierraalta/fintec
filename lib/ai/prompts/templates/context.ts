/**
 * Context Template
 * 
 * Templates para formatear contexto dinámico del usuario.
 */

import { WalletContext } from '../../context-builder';
import { PromptTemplate } from '../types';

/**
 * Formatea el resumen de cuentas
 */
export function formatAccountsSummary(context: WalletContext): string {
  if (context.accounts.total === 0) {
    return 'No tienes cuentas registradas.';
  }

  const accountsList = context.accounts.summary
    .map(acc => `- ${acc.name} (${acc.type}): ${acc.balance.toFixed(2)} ${acc.currency}`)
    .join('\n');

  // Formatear totales por moneda
  const totalTexts = Object.entries(context.accounts.totalBalance || {})
    .map(([currency, amount]) => `Total ${currency}: ${amount.toFixed(2)}`)
    .join('\n');

  const totalText = totalTexts ? `\n${totalTexts}` : '';

  return `Tienes ${context.accounts.total} cuenta(s):\n${accountsList}${totalText}`;
}

/**
 * Formatea las transacciones recientes
 */
export function formatRecentTransactions(context: WalletContext, limit: number = 5): string {
  if (context.transactions.recent.length === 0) {
    return 'No hay transacciones recientes';
  }

  const transactions = context.transactions.recent
    .slice(0, limit)
    .map(tx => {
      const sign = tx.type === 'INCOME' ? '+' : '-';
      const icon = tx.type === 'INCOME' ? '📈' : '📉';
      return `${icon} ${tx.date} | ${sign}${tx.amount.toFixed(2)} | ${tx.category || 'Sin categoría'} | ${tx.description || 'Sin descripción'}`;
    })
    .join('\n');

  return `Transacciones recientes (últimas ${Math.min(limit, context.transactions.recent.length)}):\n${transactions}`;
}

/**
 * Formatea el resumen de transacciones del mes
 */
export function formatTransactionsSummary(context: WalletContext): string {
  return `Resumen del mes:
- Ingresos: ${context.transactions.summary.incomeThisMonth.toFixed(2)}
- Gastos: ${context.transactions.summary.expensesThisMonth.toFixed(2)}
- Neto: ${context.transactions.summary.netThisMonth.toFixed(2)}`;
}

/**
 * Formatea los presupuestos activos
 */
export function formatBudgets(context: WalletContext): string {
  if (context.budgets.active.length === 0) {
    return 'No hay presupuestos activos';
  }

  return context.budgets.active
    .map(b => `- ${b.category}: Presupuesto ${b.budget.toFixed(2)}, Gastado ${b.spent.toFixed(2)}, Restante ${b.remaining.toFixed(2)} (${b.percentage}%)`)
    .join('\n');
}

/**
 * Formatea las metas activas
 */
export function formatGoals(context: WalletContext): string {
  if (context.goals.active.length === 0) {
    return 'No hay metas activas';
  }

  return context.goals.active
    .map(g => {
      const dateText = g.targetDate ? ` - Fecha objetivo: ${g.targetDate}` : '';
      return `- ${g.name}: ${g.current.toFixed(2)} / ${g.target.toFixed(2)} (${g.progress}%)${dateText}`;
    })
    .join('\n');
}

/**
 * Formatea las cuentas disponibles como lista
 */
export function formatAvailableAccounts(context: WalletContext): string {
  if (context.accounts.total === 0) {
    return 'Ninguna';
  }

  return context.accounts.summary
    .map(acc => acc.name)
    .join(', ');
}

/**
 * Crea el template de contexto dinámico
 */
export function createContextTemplate(context: WalletContext, proactiveSuggestions?: string): PromptTemplate {
  const accountsSummary = formatAccountsSummary(context);
  const availableAccounts = formatAvailableAccounts(context);
  const recentTransactions = formatRecentTransactions(context, 5);
  const transactionsSummary = formatTransactionsSummary(context);
  const budgets = formatBudgets(context);
  const goals = formatGoals(context);

  const contextContent = `CONTEXTO ACTUAL DE LA BILLETERA DEL USUARIO:
${accountsSummary}

CUENTAS DISPONIBLES: ${availableAccounts}

TRANSACCIONES:
${recentTransactions}
${transactionsSummary}

PRESUPUESTOS:
${budgets}

METAS:
${goals}
${proactiveSuggestions || ''}

DATOS COMPLETOS (JSON):
${JSON.stringify(context, null, 2)}`;

  return {
    name: 'context',
    version: '1.0.0',
    content: contextContent,
    priority: 7,
    optional: false,
    dependencies: ['identity'],
    requiredVariables: ['context', 'proactiveSuggestions'],
  };
}

