import { RequestContext } from '@/lib/cache/request-context';
import { SupabaseBudgetsRepository } from '@/repositories/supabase/budgets-repository-impl';
import { SupabaseGoalsRepository } from '@/repositories/supabase/goals-repository-impl';

describe('Phase 3: Request Memoization Spread (Budgets & Goals)', () => {
  function createMockClient() {
    let accountScopeQueries = 0;
    const auth = {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    };

    const from = jest.fn((table: string) => {
      if (table === 'accounts') {
        const queryBuilder = {
          eq: jest.fn().mockImplementation((col) => {
            if (col === 'active') accountScopeQueries++;
            return queryBuilder;
          }),
          then: (resolve: any) =>
            resolve({ data: [{ id: 'acc-1' }], error: null }),
        };
        return {
          select: jest.fn(() => queryBuilder),
        };
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
                then: (resolve: any) => resolve({ data: [], error: null }),
              })),
            })),
          })),
        })),
      };
    });

    return {
      client: { auth, from } as any,
      getQueries: () => accountScopeQueries,
      resetQueries: () => {
        accountScopeQueries = 0;
      },
    };
  }

  it('SupabaseBudgetsRepository deduplicates account scope queries with RequestContext', async () => {
    let accountScopeQueries = 0;
    const auth = {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    };

    const from = jest.fn((table: string) => {
      if (table === 'accounts') {
        const queryBuilder = {
          eq: jest.fn().mockImplementation((col) => {
            if (col === 'active') accountScopeQueries++;
            return queryBuilder;
          }),
          then: (resolve: any) =>
            resolve({ data: [{ id: 'acc-1' }], error: null }),
        };
        return {
          select: jest.fn(() => queryBuilder),
        };
      }
      if (table === 'budgets') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [
                      {
                        category_id: 'cat-1',
                        month_year: '2024-01',
                        amount_base_minor: 1000,
                        id: 'b1',
                      },
                    ],
                    error: null,
                  }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'transactions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  gte: () => ({
                    lt: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        } as any;
      }
      return {
        select: () => ({
          eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        }),
      } as any;
    });

    const client = { auth, from } as any;
    const requestContext = new RequestContext('user-1');
    const repo = new SupabaseBudgetsRepository(client, requestContext);

    // Execution should trigger account scope lookup via getOwnedAccountIds
    // We call it for a month that has 1 budget (from our mock)
    await repo.getBudgetsWithProgress('2024-01');

    // Should only have queried DB for scope once
    expect(accountScopeQueries).toBe(1);

    // Call again, should still be 1 (memoized)
    await repo.getBudgetsWithProgress('2024-01');
    expect(accountScopeQueries).toBe(1);
  });

  it('SupabaseGoalsRepository uses userId from RequestContext without calling auth.getUser()', async () => {
    const { client } = createMockClient();
    const requestContext = new RequestContext('user-1');
    const repo = new SupabaseGoalsRepository(client, requestContext);

    await repo.findAll();

    // auth.getUser should NOT have been called because userId was in context
    expect(client.auth.getUser).not.toHaveBeenCalled();
  });

  it('SupabaseBudgetsRepository uses userId from RequestContext without calling auth.getUser()', async () => {
    const { client } = createMockClient();
    const requestContext = new RequestContext('user-1');
    const repo = new SupabaseBudgetsRepository(client, requestContext);

    await repo.findAll();

    // auth.getUser should NOT have been called because userId was in context
    expect(client.auth.getUser).not.toHaveBeenCalled();
  });
});
