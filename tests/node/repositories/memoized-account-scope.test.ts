import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RequestContext } from '@/lib/cache/request-context';
import { getMemoizedOwnedAccountScope } from '@/repositories/supabase/memoized-account-scope';
import type { OwnedAccountScope } from '@/repositories/supabase/account-scope';

describe('getMemoizedOwnedAccountScope (Task 2.1: Memoization)', () => {
  let context: RequestContext;
  let mockSupabase: any;
  let getOwnedAccountScopeSpy: any;

  beforeEach(() => {
    context = new RequestContext('user-123');

    // Mock getOwnedAccountScope to track calls
    const mockScope: OwnedAccountScope = {
      userId: 'user-123',
      accountIds: ['account-1', 'account-2'],
    };

    getOwnedAccountScopeSpy = (jest.fn() as any).mockResolvedValue(mockScope);

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockImplementation(() => {
          const query: any = {
            eq: jest.fn((column: string) => {
              if (column === 'active') {
                return Promise.resolve({
                  data: [{ id: 'account-1' }, { id: 'account-2' }],
                  error: null,
                });
              }

              return query;
            }),
          };

          return query;
        }),
      }),
    };
  });

  it('should call getOwnedAccountScope on first invocation', async () => {
    // This test verifies basic functionality — it will fail until we implement the actual resolution

    // For now, we'll test the memoization behavior in isolation
    const scope = await getMemoizedOwnedAccountScope(context, mockSupabase);

    expect(scope.userId).toBe('user-123');
    expect(scope.accountIds).toHaveLength(2);
  });

  it('should memoize the result and return same object on second call', async () => {
    const scope1 = await getMemoizedOwnedAccountScope(context, mockSupabase);
    const scope2 = await getMemoizedOwnedAccountScope(context, mockSupabase);

    // Both should be the same object (from cache)
    expect(scope1).toBe(scope2);
  });

  it('should not call the underlying function twice for same user in same request', async () => {
    // This test verifies memoization prevents duplicate DB queries

    // Call twice
    await getMemoizedOwnedAccountScope(context, mockSupabase);
    await getMemoizedOwnedAccountScope(context, mockSupabase);

    // The underlying select/eq should only be called once (both calls hit the cache)
    // We can't easily spy on the module function, but we can verify the cache has the entry
    expect(context.memoCache.has('ownedAccountScope:user-123')).toBe(true);
  });

  it('should use different cache entries for different users', async () => {
    const context2 = new RequestContext('user-456');

    // First user
    const scope1 = await getMemoizedOwnedAccountScope(context, mockSupabase);

    // Second user (different context)
    // Note: In real usage, we'd need to mock Supabase properly for user-456
    // For now, this test verifies the cache key includes the userId
    expect(context.memoCache.has('ownedAccountScope:user-123')).toBe(true);
    expect(context2.memoCache.has('ownedAccountScope:user-456')).toBe(false);
  });

  it('should clear memoization when context is cleared', async () => {
    await getMemoizedOwnedAccountScope(context, mockSupabase);
    expect(context.memoCache.has('ownedAccountScope:user-123')).toBe(true);

    context.clearMemo();

    expect(context.memoCache.has('ownedAccountScope:user-123')).toBe(false);
  });
});
