/**
 * Task 2.12: Mutation Hooks with Cache Invalidation
 *
 * Tests for mutation hooks that handle create/update/delete operations
 * with proper React Query cache invalidation.
 */

describe('use-mutations', () => {
  it('should export mutation hooks from the file', async () => {
    const mod = await import('@/hooks/queries/use-mutations');
    expect(mod.useCreateTransaction).toBeDefined();
    expect(mod.useUpdateTransaction).toBeDefined();
    expect(mod.useDeleteTransaction).toBeDefined();
    expect(mod.useCreateAccount).toBeDefined();
    expect(mod.useUpdateAccount).toBeDefined();
    expect(mod.useCreateCategory).toBeDefined();
    expect(mod.useUpdateCategory).toBeDefined();
    expect(mod.useDeleteCategory).toBeDefined();
  });

  it('should have useCreateTransaction as a function', async () => {
    const { useCreateTransaction } = await import('@/hooks/queries/use-mutations');
    expect(typeof useCreateTransaction).toBe('function');
  });

  it('should have useUpdateTransaction as a function', async () => {
    const { useUpdateTransaction } = await import('@/hooks/queries/use-mutations');
    expect(typeof useUpdateTransaction).toBe('function');
  });

  it('should have useDeleteTransaction as a function', async () => {
    const { useDeleteTransaction } = await import('@/hooks/queries/use-mutations');
    expect(typeof useDeleteTransaction).toBe('function');
  });
});
