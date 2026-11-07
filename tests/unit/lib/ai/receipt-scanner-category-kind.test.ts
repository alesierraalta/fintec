/**
 * #115: a category id picked by the vision model is only trusted when its
 * kind matches the scanned movement, so an expense receipt can never land in
 * an income category (or the reverse).
 */

const mockGenerateObject = jest.fn();

jest.mock('ai', () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));
jest.mock('@/lib/ai/config', () => ({
  getVisionModel: jest.fn(() => 'model'),
}));
jest.mock('@/lib/ai/recovery/circuit-breaker', () => ({
  CircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: (fn: () => Promise<unknown>) => fn(),
  })),
}));
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { scanReceiptWithAI } from '@/lib/ai/receipt-scanner/scanner-service';

const categories = [
  { id: 'cat-food', name: 'Alimentación', kind: 'EXPENSE' as const },
  { id: 'cat-salary', name: 'Salario', kind: 'INCOME' as const },
];

function modelReturns(raw: Record<string, unknown>) {
  mockGenerateObject.mockResolvedValue({
    object: {
      amount: 12.5,
      currency: 'USD',
      suggestedMotive: 'Almuerzo',
      items: [],
      tags: [],
      ...raw,
    },
  });
}

describe('scanReceiptWithAI category kind validation (#115)', () => {
  it('ignores a model-chosen income category on an expense receipt', async () => {
    modelReturns({
      type: 'EXPENSE',
      suggestedCategoryId: 'cat-salary',
      suggestedCategory: 'Salario',
    });

    const result = await scanReceiptWithAI({
      image: 'data:image/png;base64,AA==',
      categories,
    });

    expect(result.suggestedCategoryId).not.toBe('cat-salary');
  });

  it('keeps a model-chosen category whose kind matches the receipt', async () => {
    modelReturns({
      type: 'EXPENSE',
      suggestedCategoryId: 'cat-food',
      suggestedCategory: 'Comida',
    });

    const result = await scanReceiptWithAI({
      image: 'data:image/png;base64,AA==',
      categories,
    });

    expect(result.suggestedCategoryId).toBe('cat-food');
  });
});
