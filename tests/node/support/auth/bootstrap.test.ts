import { bootstrapCanonicalFixtures } from '@/tests/support/auth/bootstrap';

describe('bootstrapCanonicalFixtures', () => {
  it('posts to the bootstrap endpoint and returns fixture data', async () => {
    const json = jest.fn().mockResolvedValue({
      success: true,
      data: {
        account: {
          id: 'account-1',
          name: 'Fintec Canonical Cash',
          currencyCode: 'USD',
        },
        incomeCategory: {
          id: 'income-1',
          name: 'Fintec Canonical Income',
          kind: 'INCOME',
        },
        expenseCategory: {
          id: 'expense-1',
          name: 'Fintec Canonical Expense',
          kind: 'EXPENSE',
        },
        created: {
          account: false,
          incomeCategory: true,
          expenseCategory: true,
        },
        profile: {
          email: 'test@fintec.com',
          displayName: 'Test User',
          baseCurrency: 'USD',
        },
      },
    });
    const post = jest.fn().mockResolvedValue({
      ok: () => true,
      json,
    });

    const result = await bootstrapCanonicalFixtures({
      request: {
        post,
      },
    } as never);

    expect(post).toHaveBeenCalledWith('/api/testing/bootstrap');
    expect(result.account.id).toBe('account-1');
    expect(result.incomeCategory.id).toBe('income-1');
    expect(result.expenseCategory.id).toBe('expense-1');
    expect(result.profile.baseCurrency).toBe('USD');
  });

  it('throws when the bootstrap endpoint reports a failure', async () => {
    const post = jest.fn().mockResolvedValue({
      ok: () => false,
      json: jest.fn().mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      }),
    });

    await expect(
      bootstrapCanonicalFixtures({
        request: {
          post,
        },
      } as never)
    ).rejects.toThrow('Unauthorized');
  });
});
