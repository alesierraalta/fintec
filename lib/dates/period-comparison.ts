/**
 * Period comparison utilities for calculating trends and percentage changes
 */

import { TimePeriod } from './periods';

export interface PeriodComparison {
  current: TimePeriod;
  previous: TimePeriod;
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  percentageChange: number;
  isPositive: boolean;
}

export function getPreviousPeriod(currentPeriod: TimePeriod): TimePeriod {
  const duration = currentPeriod.endDate.getTime() - currentPeriod.startDate.getTime();
  
  return {
    id: `previous-${currentPeriod.id}`,
    label: `Período Anterior`,
    startDate: new Date(currentPeriod.startDate.getTime() - duration),
    endDate: new Date(currentPeriod.endDate.getTime() - duration)
  };
}

export function calculateTrend(currentValue: number, previousValue: number): TrendData {
  const change = currentValue - previousValue;
  let percentageChange = 0;
  
  if (previousValue !== 0) {
    percentageChange = (change / Math.abs(previousValue)) * 100;
  } else if (currentValue > 0) {
    percentageChange = 100; // New positive value
  } else if (currentValue < 0) {
    percentageChange = -100; // New negative value
  }
  
  return {
    current: currentValue,
    previous: previousValue,
    change,
    percentageChange: Math.round(percentageChange * 10) / 10, // Round to 1 decimal
    isPositive: change >= 0
  };
}

export function formatTrendPercentage(trend: TrendData): string {
  if (trend.percentageChange === 0) return '0%';
  
  const sign = trend.percentageChange > 0 ? '+' : '';
  return `${sign}${trend.percentageChange}%`;
}

export function getTrendColor(trend: TrendData, isExpenseMetric: boolean = false): string {
  // For expense metrics, positive change is bad (red), negative is good (green)
  // For income/savings metrics, positive change is good (green), negative is bad (red)
  
  if (trend.percentageChange === 0) return 'text-gray-500';
  
  if (isExpenseMetric) {
    return trend.percentageChange > 0 ? 'text-red-500' : 'text-green-500';
  } else {
    return trend.percentageChange > 0 ? 'text-green-500' : 'text-red-500';
  }
}

export function filterTransactionsByPeriod(transactions: any[], period: TimePeriod): any[] {
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= period.startDate && transactionDate <= period.endDate;
  });
}

export function calculateMetricsForPeriod(transactions: any[]) {
  // Filter by transaction type instead of amount sign
  const incomeTransactions = transactions.filter(t => t.type === 'INCOME');
  const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');
  
  // Use amountBaseMinor and convert from minor units (cents) to major units (dollars)
  const income = incomeTransactions.reduce((sum, t) => sum + (t.amountBaseMinor / 100), 0);
  const expenses = expenseTransactions.reduce((sum, t) => sum + (t.amountBaseMinor / 100), 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income * 100) : 0;
  
  // Nuevas métricas fundamentales
  const totalTransactions = transactions.length;
  const avgTransactionAmount = totalTransactions > 0 ? (income + expenses) / totalTransactions : 0;
  const avgDailyExpenses = expenseTransactions.length > 0 ? expenses / 30 : 0; // Aproximado mensual
  const avgDailyIncome = incomeTransactions.length > 0 ? income / 30 : 0;
  const netCashFlow = income - expenses;
  const expenseRatio = income > 0 ? (expenses / income * 100) : 0;
  const transactionFrequency = {
    income: incomeTransactions.length,
    expenses: expenseTransactions.length
  };
  
  // Encontrar la categoría con mayor gasto
  const categorySpending: Record<string, number> = {};
  expenseTransactions.forEach(t => {
    const categoryId = t.categoryId || 'uncategorized';
    categorySpending[categoryId] = (categorySpending[categoryId] || 0) + (t.amountBaseMinor / 100);
  });
  
  const topSpendingCategory = Object.entries(categorySpending)
    .sort(([,a], [,b]) => b - a)[0] || ['N/A', 0];
  
  return {
    // Métricas originales
    income,
    expenses,
    savings,
    savingsRate,
    // Nuevas métricas fundamentales
    totalTransactions,
    avgTransactionAmount,
    avgDailyExpenses,
    avgDailyIncome,
    netCashFlow,
    expenseRatio,
    transactionFrequency,
    topSpendingCategory: {
      categoryId: topSpendingCategory[0],
      amount: topSpendingCategory[1]
    }
  };
}
