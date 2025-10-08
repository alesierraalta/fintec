import { describe, it, expect } from '@jest/globals';
import { calculateMetricsForPeriod } from '@/lib/dates/period-comparison';

describe('calculateMetricsForPeriod', () => {
  it('should calculate metrics correctly with real transaction data', () => {
    const mockTransactions = [
      {
        id: '1',
        type: 'INCOME',
        amountBaseMinor: 100000, // $1000.00
        amountMinor: 100000,
        categoryId: 'salary',
        date: '2025-01-01',
      },
      {
        id: '2',
        type: 'EXPENSE',
        amountBaseMinor: 25000, // $250.00
        amountMinor: 25000,
        categoryId: 'food',
        date: '2025-01-02',
      },
      {
        id: '3',
        type: 'EXPENSE',
        amountBaseMinor: 15000, // $150.00
        amountMinor: 15000,
        categoryId: 'transport',
        date: '2025-01-03',
      },
      {
        id: '4',
        type: 'INCOME',
        amountBaseMinor: 50000, // $500.00
        amountMinor: 50000,
        categoryId: 'freelance',
        date: '2025-01-04',
      },
    ];

    const result = calculateMetricsForPeriod(mockTransactions);

    // Verify income calculation
    expect(result.income).toBe(1500); // $1000 + $500
    
    // Verify expenses calculation
    expect(result.expenses).toBe(400); // $250 + $150
    
    // Verify savings calculation
    expect(result.savings).toBe(1100); // $1500 - $400
    
    // Verify savings rate
    expect(result.savingsRate).toBeCloseTo(73.33, 1); // (1100/1500) * 100
    
    // Verify transaction counts
    expect(result.totalTransactions).toBe(4);
    expect(result.transactionFrequency.income).toBe(2);
    expect(result.transactionFrequency.expenses).toBe(2);
    
    // Verify net cash flow
    expect(result.netCashFlow).toBe(1100);
    
    // Verify expense ratio
    expect(result.expenseRatio).toBeCloseTo(26.67, 1); // (400/1500) * 100
    
    // Verify top spending category
    expect(result.topSpendingCategory.categoryId).toBe('food');
    expect(result.topSpendingCategory.amount).toBe(250);
  });

  it('should handle empty transactions array', () => {
    const result = calculateMetricsForPeriod([]);

    expect(result.income).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.savings).toBe(0);
    expect(result.savingsRate).toBe(0);
    expect(result.totalTransactions).toBe(0);
  });

  it('should handle only income transactions', () => {
    const mockTransactions = [
      {
        id: '1',
        type: 'INCOME',
        amountBaseMinor: 100000,
        amountMinor: 100000,
        categoryId: 'salary',
        date: '2025-01-01',
      },
    ];

    const result = calculateMetricsForPeriod(mockTransactions);

    expect(result.income).toBe(1000);
    expect(result.expenses).toBe(0);
    expect(result.savings).toBe(1000);
    expect(result.savingsRate).toBe(100);
  });

  it('should handle only expense transactions', () => {
    const mockTransactions = [
      {
        id: '1',
        type: 'EXPENSE',
        amountBaseMinor: 50000,
        amountMinor: 50000,
        categoryId: 'food',
        date: '2025-01-01',
      },
    ];

    const result = calculateMetricsForPeriod(mockTransactions);

    expect(result.income).toBe(0);
    expect(result.expenses).toBe(500);
    expect(result.savings).toBe(-500);
    expect(result.savingsRate).toBe(0); // Avoid division by zero
    expect(result.expenseRatio).toBe(0); // Avoid division by zero
  });

  it('should handle uncategorized transactions', () => {
    const mockTransactions = [
      {
        id: '1',
        type: 'EXPENSE',
        amountBaseMinor: 10000,
        amountMinor: 10000,
        categoryId: undefined,
        date: '2025-01-01',
      },
    ];

    const result = calculateMetricsForPeriod(mockTransactions);

    expect(result.topSpendingCategory.categoryId).toBe('uncategorized');
    expect(result.topSpendingCategory.amount).toBe(100);
  });
});

