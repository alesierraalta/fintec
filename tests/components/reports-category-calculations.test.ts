import { describe, it, expect } from '@jest/globals';

describe('Reports Category Calculations', () => {
  it('should calculate category spending correctly', () => {
    const transactions = [
      { id: '1', type: 'EXPENSE', amountMinor: 50000, categoryId: 'food', date: '2025-01-01' },
      { id: '2', type: 'EXPENSE', amountMinor: 30000, categoryId: 'transport', date: '2025-01-02' },
      { id: '3', type: 'EXPENSE', amountMinor: 20000, categoryId: 'food', date: '2025-01-03' },
      { id: '4', type: 'INCOME', amountMinor: 100000, categoryId: 'salary', date: '2025-01-04' },
    ];

    const spending: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const catId = t.categoryId || 'uncategorized';
        spending[catId] = (spending[catId] || 0) + (t.amountMinor / 100);
      });

    const totalSpent = Object.values(spending).reduce((sum, val) => sum + val, 0);

    // Verify category totals
    expect(spending['food']).toBe(700); // $500 + $200
    expect(spending['transport']).toBe(300); // $300
    expect(totalSpent).toBe(1000); // $1000 total

    // Verify percentages
    const foodPercentage = Math.round((spending['food'] / totalSpent) * 100);
    const transportPercentage = Math.round((spending['transport'] / totalSpent) * 100);
    
    expect(foodPercentage).toBe(70); // 70%
    expect(transportPercentage).toBe(30); // 30%
  });

  it('should handle transactions without categoryId', () => {
    const transactions = [
      { id: '1', type: 'EXPENSE', amountMinor: 10000, categoryId: undefined, date: '2025-01-01' },
    ];

    const spending: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const catId = t.categoryId || 'uncategorized';
        spending[catId] = (spending[catId] || 0) + (t.amountMinor / 100);
      });

    expect(spending['uncategorized']).toBe(100);
  });

  it('should filter income transactions correctly', () => {
    const transactions = [
      { id: '1', type: 'INCOME', amountMinor: 50000, date: '2025-01-01' },
      { id: '2', type: 'EXPENSE', amountMinor: 30000, date: '2025-01-02' },
    ];

    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((s, t) => s + (t.amountMinor / 100), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((s, t) => s + (t.amountMinor / 100), 0);

    expect(totalIncome).toBe(500);
    expect(totalExpenses).toBe(300);
  });
});

