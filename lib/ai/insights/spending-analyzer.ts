/**
 * Spending Analyzer - Detects patterns and anomalies in user spending.
 * 
 * @module lib/ai/insights/spending-analyzer
 */

import { Transaction } from '@/types';

/**
 * Extended transaction type with account information
 */
export interface TransactionWithAccount extends Transaction {
    accountName?: string;
    categoryName?: string;
}

/**
 * Spending insight result
 */
export interface SpendingInsight {
    type: 'warning' | 'info' | 'tip';
    emoji: string;
    message: string;
}

/**
 * Account flow statistics
 */
export interface AccountFlowStats {
    accountName: string;
    totalIncome: number;
    totalExpense: number;
    transactionCount: number;
    percentageOfTotal: number;
}

/**
 * Analyzes transactions to generate spending insights.
 * 
 * @param transactions - Array of transactions with account info
 * @returns Array of spending insights
 * 
 * @example
 * const insights = analyzeSpending(transactions);
 * // => [{ type: 'warning', emoji: '⚠️', message: '68% de gastos desde Zelle' }]
 */
export function analyzeSpending(transactions: TransactionWithAccount[]): SpendingInsight[] {
    const insights: SpendingInsight[] = [];

    if (transactions.length === 0) {
        return insights;
    }

    // 1. Analyze spending by account
    const accountFlow = analyzeAccountFlow(transactions);

    // Find dominant expense account (>50% of expenses)
    const dominantExpenseAccount = accountFlow.find(
        a => a.totalExpense > 0 && a.percentageOfTotal > 50
    );

    if (dominantExpenseAccount) {
        insights.push({
            type: 'info',
            emoji: '📊',
            message: `${Math.round(dominantExpenseAccount.percentageOfTotal)}% de tus gastos provienen de "${dominantExpenseAccount.accountName}"`,
        });
    }

    // 2. Detect recurring patterns (like loans)
    const loanPattern = detectLoanPattern(transactions);
    if (loanPattern) {
        insights.push({
            type: 'tip',
            emoji: '💸',
            message: loanPattern,
        });
    }

    // 3. Find main income source
    const incomeAccount = accountFlow.find(a => a.totalIncome > 0);
    if (incomeAccount && incomeAccount.totalIncome > 0) {
        const incomeRatio = (incomeAccount.totalIncome /
            accountFlow.reduce((sum, a) => sum + a.totalIncome, 0)) * 100;

        if (incomeRatio > 70) {
            insights.push({
                type: 'info',
                emoji: '💼',
                message: `Ingresos concentrados en "${incomeAccount.accountName}"`,
            });
        }
    }

    return insights;
}

/**
 * Analyzes transaction flow by account.
 * 
 * @param transactions - Array of transactions with account info
 * @returns Array of account flow statistics
 */
export function analyzeAccountFlow(transactions: TransactionWithAccount[]): AccountFlowStats[] {
    const accountMap = new Map<string, AccountFlowStats>();
    let totalExpenses = 0;

    transactions.forEach(tx => {
        const accountName = tx.accountName || 'Unknown';

        if (!accountMap.has(accountName)) {
            accountMap.set(accountName, {
                accountName,
                totalIncome: 0,
                totalExpense: 0,
                transactionCount: 0,
                percentageOfTotal: 0,
            });
        }

        const stats = accountMap.get(accountName)!;
        stats.transactionCount++;

        if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT') {
            stats.totalExpense += tx.amountBaseMinor;
            totalExpenses += tx.amountBaseMinor;
        } else if (tx.type === 'INCOME' || tx.type === 'TRANSFER_IN') {
            stats.totalIncome += tx.amountBaseMinor;
        }
    });

    // Calculate percentages
    accountMap.forEach(stats => {
        stats.percentageOfTotal = totalExpenses > 0
            ? (stats.totalExpense / totalExpenses) * 100
            : 0;
    });

    return Array.from(accountMap.values())
        .sort((a, b) => b.totalExpense - a.totalExpense);
}

/**
 * Detects loan/lending patterns in transactions.
 * 
 * @param transactions - Array of transactions
 * @returns Pattern description or null
 */
function detectLoanPattern(transactions: TransactionWithAccount[]): string | null {
    const loanKeywords = ['préstamo', 'prestamo', 'loan', 'deuda'];

    const loanTransactions = transactions.filter(tx =>
        loanKeywords.some(keyword =>
            tx.description?.toLowerCase().includes(keyword)
        )
    );

    if (loanTransactions.length >= 2) {
        // Find most common loan partner
        const partners = new Map<string, number>();
        loanTransactions.forEach(tx => {
            const desc = tx.description?.toLowerCase() || '';
            loanKeywords.forEach(keyword => {
                const match = desc.replace(keyword, '').trim();
                if (match) {
                    partners.set(match, (partners.get(match) || 0) + 1);
                }
            });
        });

        const topPartner = Array.from(partners.entries())
            .sort((a, b) => b[1] - a[1])[0];

        if (topPartner && topPartner[1] >= 2) {
            return `Patrón detectado: Préstamos frecuentes con "${topPartner[0]}"`;
        }
    }

    return null;
}

/**
 * Formats insights for display in AI response.
 * 
 * @param insights - Array of spending insights
 * @returns Formatted string
 */
export function formatInsights(insights: SpendingInsight[]): string {
    if (insights.length === 0) {
        return '';
    }

    const lines = ['', '🧠 Análisis:'];
    insights.forEach(insight => {
        lines.push(`• ${insight.message}`);
    });

    return lines.join('\n');
}
