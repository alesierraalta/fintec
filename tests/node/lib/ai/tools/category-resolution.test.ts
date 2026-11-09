/**
 * Regression tests for #113: chat-created transactions must resolve their
 * category among default AND user categories of the same kind, and must ask
 * for clarification instead of silently falling back to the first user
 * category (the "everything goes to Carros" bug).
 */

jest.mock('@/lib/ai/rag/embeddings', () => ({ embedText: jest.fn() }));
jest.mock('@/lib/ai/rag/reranker', () => ({ rerankCandidates: jest.fn() }));

import { createTransaction } from '@/lib/ai/tools/resolvers';

const CATEGORIES = [
  // Default categories are stored with user_id NULL.
  {
    id: 'def-food',
    name: 'Alimentación',
    kind: 'EXPENSE',
    userId: null,
    active: true,
  },
  {
    id: 'def-health',
    name: 'Salud',
    kind: 'EXPENSE',
    userId: null,
    active: true,
  },
  {
    id: 'def-salary',
    name: 'Salario',
    kind: 'INCOME',
    userId: null,
    active: true,
  },
  // The user's first custom category, which used to swallow everything.
  {
    id: 'usr-cars',
    name: 'Carros',
    kind: 'EXPENSE',
    userId: 'user-1',
    active: true,
  },
  {
    id: 'usr-gym',
    name: 'Gimnasio',
    kind: 'EXPENSE',
    userId: 'user-1',
    active: true,
  },
];

function makeRepository() {
  return {
    accounts: {
      findByUserId: jest.fn().mockResolvedValue([
        { id: 'acc-usd', name: 'Banesco USD', currencyCode: 'USD' },
        { id: 'acc-ves', name: 'Mercantil', currencyCode: 'VES' },
      ]),
    },
    categories: { findAll: jest.fn().mockResolvedValue(CATEGORIES) },
    transactions: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
  };
}

const ctx = (repository: ReturnType<typeof makeRepository>) => ({
  userId: 'user-1',
  repository: repository as any,
});

describe('createTransaction category resolution (#113)', () => {
  it('resolves a default category by meaning instead of falling back to the first user category', async () => {
    const repository = makeRepository();

    const result = await createTransaction(
      {
        amount: 12,
        description: 'Almuerzo',
        category: 'Comida',
        type: 'EXPENSE',
      } as any,
      ctx(repository)
    );

    expect(result).toMatchObject({
      status: 'success',
      transaction: { categoryName: 'Alimentación' },
    });
    expect(repository.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'def-food' })
    );
  });

  it('uses an exact category id chosen by the model', async () => {
    const repository = makeRepository();

    await createTransaction(
      {
        amount: 30,
        description: 'Mensualidad',
        category: 'Gimnasio',
        categoryId: 'usr-gym',
        type: 'EXPENSE',
      } as any,
      ctx(repository)
    );

    expect(repository.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'usr-gym' })
    );
  });

  it('matches names accent- and case-insensitively', async () => {
    const repository = makeRepository();

    await createTransaction(
      {
        amount: 5,
        description: 'Mercado',
        category: 'alimentacion',
        type: 'EXPENSE',
      } as any,
      ctx(repository)
    );

    expect(repository.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'def-food' })
    );
  });

  it('never puts income into an expense category', async () => {
    const repository = makeRepository();

    const result = await createTransaction(
      {
        amount: 800,
        description: 'Pago de nómina',
        category: 'Sueldo',
        type: 'INCOME',
      } as any,
      ctx(repository)
    );

    expect(result).toMatchObject({
      status: 'success',
      transaction: { type: 'INCOME', categoryName: 'Salario' },
    });
    expect(repository.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'def-salary', type: 'INCOME' })
    );
  });

  it('ignores a model-chosen id whose kind does not match the transaction type', async () => {
    const repository = makeRepository();

    await createTransaction(
      {
        amount: 800,
        description: 'Pago de nómina',
        category: 'Sueldo',
        categoryId: 'usr-cars',
        type: 'INCOME',
      } as any,
      ctx(repository)
    );

    expect(repository.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'def-salary' })
    );
  });

  it('asks for the category instead of guessing when nothing matches, and creates nothing', async () => {
    const repository = makeRepository();

    const result = await createTransaction(
      {
        amount: 40,
        description: 'Cosa rara',
        category: 'Misceláneo',
        type: 'EXPENSE',
      } as any,
      ctx(repository)
    );

    expect(result).toEqual({
      status: 'needs_clarification',
      field: 'category',
      message: expect.stringContaining('Misceláneo'),
      options: ['Alimentación', 'Salud', 'Carros', 'Gimnasio'],
    });
    expect(repository.transactions.create).not.toHaveBeenCalled();
  });

  it('asks instead of trusting a description-only keyword guess', async () => {
    const repository = makeRepository();

    // "la compra del abasto" used to score "Compras" from the description alone.
    const result = await createTransaction(
      {
        amount: 74,
        description: 'la compra del abasto',
        category: 'Varios',
        type: 'EXPENSE',
      } as any,
      ctx(repository)
    );

    expect(result).toMatchObject({
      status: 'needs_clarification',
      field: 'category',
    });
    expect(repository.transactions.create).not.toHaveBeenCalled();
  });

  it('asks for the account when the named account does not exist, and creates nothing', async () => {
    const repository = makeRepository();

    const result = await createTransaction(
      {
        amount: 12,
        description: 'Almuerzo',
        category: 'Comida',
        accountName: 'Provincial',
        type: 'EXPENSE',
      } as any,
      ctx(repository)
    );

    expect(result).toEqual({
      status: 'needs_clarification',
      field: 'account',
      message: expect.stringContaining('Provincial'),
      options: ['Banesco USD', 'Mercantil'],
    });
    expect(repository.transactions.create).not.toHaveBeenCalled();
  });

  it('matches the account name accent- and case-insensitively', async () => {
    const repository = makeRepository();

    await createTransaction(
      {
        amount: 12,
        description: 'Almuerzo',
        category: 'Comida',
        accountName: 'mercantil',
        type: 'EXPENSE',
      } as any,
      { ...ctx(repository), baseCurrencyCode: 'USD', usdVesRate: 500 }
    );

    expect(repository.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'acc-ves', currencyCode: 'VES' })
    );
  });
});
