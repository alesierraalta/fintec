/**
 * Task 3.7: Cache Tag Support for Transaction Keys
 *
 * Tests for cache tag generation and invalidation patterns.
 * Extends the existing transaction keys with cache tag support.
 */

describe('transactionKeys cache tags', () => {
  let transactionKeys: typeof import('@/hooks/queries/transaction-keys').transactionKeys;

  beforeAll(async () => {
    const mod = await import('@/hooks/queries/transaction-keys');
    transactionKeys = mod.transactionKeys;
  });

  describe('tag factory', () => {
    it('should have a tags factory on transactionKeys', () => {
      expect(transactionKeys.tags).toBeDefined();
      expect(typeof transactionKeys.tags).toBe('object');
    });

    it('should generate tag for all transactions', () => {
      const tag = transactionKeys.tags.all();
      expect(tag).toEqual(['transactions', 'tag']);
    });

    it('should generate tag for transaction list', () => {
      const tag = transactionKeys.tags.list();
      expect(tag).toEqual(['transactions', 'tag', 'list']);
    });

    it('should generate tag for a specific transaction', () => {
      const tag = transactionKeys.tags.detail('tx-1');
      expect(tag).toEqual(['transactions', 'tag', 'detail', 'tx-1']);
    });

    it('should generate tag for monthly report', () => {
      const tag = transactionKeys.tags.monthlyReport(2026, 5);
      expect(tag).toEqual(['transactions', 'tag', 'monthly', 2026, 5]);
    });

    it('should generate tag for account-scoped queries', () => {
      const tag = transactionKeys.tags.byAccount('acc-1');
      expect(tag).toEqual(['transactions', 'tag', 'account', 'acc-1']);
    });
  });

  describe('invalidation helpers', () => {
    it('should have an invalidate object', () => {
      expect(typeof transactionKeys.invalidate).toBe('object');
      expect(typeof transactionKeys.invalidate.all).toBe('function');
      expect(typeof transactionKeys.invalidate.detail).toBe('function');
      expect(typeof transactionKeys.invalidate.byAccount).toBe('function');
    });

    it('should return all list-related tags for invalidation', () => {
      const tags = transactionKeys.invalidate.all();
      expect(tags).toEqual(expect.arrayContaining([
        ['transactions', 'tag', 'list'],
      ]));
    });

    it('should return detail tags for a specific transaction', () => {
      const tags = transactionKeys.invalidate.detail('tx-1');
      expect(tags).toEqual([
        ['transactions', 'tag', 'detail', 'tx-1'],
      ]);
    });

    it('should return account-related tags', () => {
      const tags = transactionKeys.invalidate.byAccount('acc-1');
      expect(tags).toEqual(expect.arrayContaining([
        ['transactions', 'tag', 'account', 'acc-1'],
        ['transactions', 'tag', 'list'],
      ]));
    });
  });
});
