/**
 * Task 3.6: Context-Scoped Repository Factory
 *
 * Tests for context-scoped factory functions that create bounded contexts
 * from the existing factory pattern.
 */

describe('Context-scoped repository factory', () => {
  it('should export createFinanceContextFromFactory function', async () => {
    const mod = await import('@/repositories/factory');
    expect(typeof mod.createFinanceContextFromFactory).toBe('function');
  });

  it('should export createRatesContextFromFactory function', async () => {
    const mod = await import('@/repositories/factory');
    expect(typeof mod.createRatesContextFromFactory).toBe('function');
  });

  it('should export createUsersContextFromFactory function', async () => {
    const mod = await import('@/repositories/factory');
    expect(typeof mod.createUsersContextFromFactory).toBe('function');
  });

  it('should export createOperationsContextFromFactory function', async () => {
    const mod = await import('@/repositories/factory');
    expect(typeof mod.createOperationsContextFromFactory).toBe('function');
  });
});
