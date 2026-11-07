/**
 * #117: "hice 3 gastos, te paso los tickets" stores amount-less pending
 * expenses that survive closing the chat, waiting for their receipts.
 */

jest.mock('@/lib/ai/rag/embeddings', () => ({ embedText: jest.fn() }));
jest.mock('@/lib/ai/rag/reranker', () => ({ rerankCandidates: jest.fn() }));

import { createPendingExpenses } from '@/lib/ai/tools/resolvers';

function makeRepository() {
  let n = 0;
  return {
    pendingItems: {
      create: jest.fn(
        async (_userId: string, data: { kind: string; name: string }) => ({
          id: `p-${++n}`,
          userId: 'user-1',
          kind: data.kind,
          name: data.name,
          amountBaseMinor: null,
          done: false,
          doneAt: null,
          convertedTransactionId: null,
          createdAt: '2026-11-07T00:00:00Z',
        })
      ),
    },
  };
}

describe('createPendingExpenses (#117)', () => {
  it('stores one receipt-pending expense per announced expense, named when the user said what it was', async () => {
    const repository = makeRepository();

    const result = await createPendingExpenses(
      { count: 3, descriptions: ['Farmacia', 'Mercado'] } as any,
      { userId: 'user-1', repository: repository as any }
    );

    expect(repository.pendingItems.create.mock.calls).toEqual([
      ['user-1', { kind: 'receipt', name: 'Farmacia' }],
      ['user-1', { kind: 'receipt', name: 'Mercado' }],
      ['user-1', { kind: 'receipt', name: 'Gasto 3' }],
    ]);
    expect(result).toEqual({
      status: 'success',
      pending: [
        { id: 'p-1', name: 'Farmacia' },
        { id: 'p-2', name: 'Mercado' },
        { id: 'p-3', name: 'Gasto 3' },
      ],
    });
  });

  it('rejects an empty or oversized batch without storing anything', async () => {
    const repository = makeRepository();

    const none = await createPendingExpenses({ count: 0 } as any, {
      userId: 'user-1',
      repository: repository as any,
    });
    const many = await createPendingExpenses({ count: 51 } as any, {
      userId: 'user-1',
      repository: repository as any,
    });

    expect(none).toMatchObject({ status: 'error' });
    expect(many).toMatchObject({ status: 'error' });
    expect(repository.pendingItems.create).not.toHaveBeenCalled();
  });
});
