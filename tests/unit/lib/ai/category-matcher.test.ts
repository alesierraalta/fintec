import { matchReceiptCategory } from '@/lib/ai/receipt-scanner/category-matcher';
import type { CategoryCandidate } from '@/lib/ai/receipt-scanner/types';

describe('category-matcher', () => {
  const mockCategories: CategoryCandidate[] = [
    { id: 'cat-alimentacion', name: 'Alimentación', kind: 'EXPENSE' },
    { id: 'cat-salud', name: 'Salud y Farmacia', kind: 'EXPENSE' },
    { id: 'cat-transporte', name: 'Transporte y Gasolina', kind: 'EXPENSE' },
    { id: 'cat-servicios', name: 'Servicios Básicos', kind: 'EXPENSE' },
    { id: 'cat-salario', name: 'Sueldo y Nómina', kind: 'INCOME' },
    { id: 'cat-freelance', name: 'Honorarios Profesionales', kind: 'INCOME' },
    { id: 'cat-ventas', name: 'Ventas del Negocio', kind: 'INCOME' },
  ];

  it('matches exact category name for EXPENSE transactions', () => {
    const result = matchReceiptCategory({
      transactionType: 'EXPENSE',
      suggestedCategoryName: 'Alimentación',
      userCategories: mockCategories,
    });

    expect(result.confidence).toBe('HIGH');
    expect(result.suggestedCategoryId).toBe('cat-alimentacion');
    expect(result.suggestedCategoryName).toBe('Alimentación');
  });

  it('matches partial category name regardless of accents or casing', () => {
    const result = matchReceiptCategory({
      transactionType: 'EXPENSE',
      suggestedCategoryName: 'farmacia',
      userCategories: mockCategories,
    });

    expect(result.confidence).toBe('HIGH');
    expect(result.suggestedCategoryId).toBe('cat-salud');
    expect(result.suggestedCategoryName).toBe('Salud y Farmacia');
  });

  it('infers category from grocery basket items when merchant name is generic', () => {
    const result = matchReceiptCategory({
      transactionType: 'EXPENSE',
      merchantOrCounterparty: 'INVERSIONES LA BENDICION 2020 C.A.',
      items: [
        { description: 'Harina PAN 1kg', quantity: 2, totalPrice: 3 },
        { description: 'Queso Paisa 500g', quantity: 1, totalPrice: 4 },
        { description: 'Leche Completa', quantity: 1, totalPrice: 2 },
      ],
      userCategories: mockCategories,
    });

    expect(result.confidence).toMatch(/HIGH|MEDIUM/);
    expect(result.suggestedCategoryId).toBe('cat-alimentacion');
  });

  it('matches INCOME transactions strictly against INCOME categories', () => {
    const result = matchReceiptCategory({
      transactionType: 'INCOME',
      suggestedMotive: 'Pago de nómina primera quincena de septiembre',
      userCategories: mockCategories,
    });

    expect(result.confidence).toBe('HIGH');
    expect(result.suggestedCategoryId).toBe('cat-salario');
    expect(result.suggestedCategoryName).toBe('Sueldo y Nómina');
  });

  it('matches freelance consulting income to professional services', () => {
    const result = matchReceiptCategory({
      transactionType: 'INCOME',
      suggestedMotive: 'Servicios de consultoría y desarrollo de software',
      userCategories: mockCategories,
    });

    expect(result.confidence).toBe('HIGH');
    expect(result.suggestedCategoryId).toBe('cat-freelance');
    expect(result.suggestedCategoryName).toBe('Honorarios Profesionales');
  });

  it('returns NONE for TRANSFER transactions', () => {
    const result = matchReceiptCategory({
      transactionType: 'TRANSFER',
      suggestedCategoryName: 'Transferencia',
      userCategories: mockCategories,
    });

    expect(result.confidence).toBe('NONE');
    expect(result.suggestedCategoryId).toBeUndefined();
  });

  it('handles empty user categories gracefully', () => {
    const result = matchReceiptCategory({
      transactionType: 'EXPENSE',
      suggestedCategoryName: 'Alimentación',
      userCategories: [],
    });

    expect(result.confidence).toBe('NONE');
    expect(result.suggestedCategoryId).toBeUndefined();
  });
});
