import { RequestContext } from '@/lib/cache/request-context';

describe('RequestContext', () => {
  describe('constructor', () => {
    it('should create a new RequestContext with user ID', () => {
      const userId = 'user-123';
      const context = new RequestContext(userId);

      expect(context.userId).toBe(userId);
    });

    it('should initialize memoization Map as empty', () => {
      const context = new RequestContext('user-123');

      expect(context.memoCache).toBeInstanceOf(Map);
      expect(context.memoCache.size).toBe(0);
    });

    it('should initialize profiler with empty metrics', () => {
      const context = new RequestContext('user-123');

      expect(context.profiler).toBeDefined();
      expect(context.profiler.events).toEqual([]);
    });
  });

  describe('memoization', () => {
    it('should store and retrieve memoized values', () => {
      const context = new RequestContext('user-123');
      const key = 'account-scope:user-123';
      const value = ['account-1', 'account-2'];

      context.memoCache.set(key, value);

      expect(context.memoCache.get(key)).toEqual(value);
    });

    it('should return undefined for unmemoized keys', () => {
      const context = new RequestContext('user-123');

      expect(context.memoCache.get('nonexistent')).toBeUndefined();
    });

    it('should support different data types in memoization', () => {
      const context = new RequestContext('user-123');

      const stringVal = 'test-string';
      const numberVal = 42;
      const objectVal = { id: '123', name: 'Test' };

      context.memoCache.set('string', stringVal);
      context.memoCache.set('number', numberVal);
      context.memoCache.set('object', objectVal);

      expect(context.memoCache.get('string')).toBe(stringVal);
      expect(context.memoCache.get('number')).toBe(numberVal);
      expect(context.memoCache.get('object')).toEqual(objectVal);
    });
  });

  describe('profiler integration', () => {
    it('should provide profiler reference', () => {
      const context = new RequestContext('user-123', 1.0);

      expect(context.profiler).toBeDefined();
      expect(typeof context.profiler.record).toBe('function');
    });

    it('should track metrics through profiler', () => {
      const context = new RequestContext('user-123', 1.0); // 100% sampling for test

      context.profiler.record({
        name: 'account_scope_lookup',
        durationMs: 5,
        bytes: 1024,
        queryCount: 1,
        rowCount: 3,
      });

      expect(context.profiler.events.length).toBe(1);
      expect(context.profiler.events[0].name).toBe('account_scope_lookup');
    });
  });

  describe('isolation', () => {
    it('should create isolated memoization caches for different contexts', () => {
      const context1 = new RequestContext('user-1');
      const context2 = new RequestContext('user-2');

      context1.memoCache.set('key', 'value-1');
      context2.memoCache.set('key', 'value-2');

      expect(context1.memoCache.get('key')).toBe('value-1');
      expect(context2.memoCache.get('key')).toBe('value-2');
    });
  });
});
