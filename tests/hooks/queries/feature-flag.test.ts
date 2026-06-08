/**
 * Task 2.15: Feature Flag for React Query Migration
 *
 * Tests for the feature flag that controls whether to use React Query
 * or fall back to useOptimizedData.
 */

describe('React Query feature flag', () => {
  it('should export feature flag utilities', async () => {
    const mod = await import('@/hooks/queries/feature-flag');
    expect(mod.isReactQueryEnabled).toBeDefined();
    expect(typeof mod.isReactQueryEnabled).toBe('function');
  });

  it('should return false when flag is not set', async () => {
    const { isReactQueryEnabled } = await import('@/hooks/queries/feature-flag');

    // Mock environment variable not set
    const originalEnv = process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY;
    delete process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY;

    const result = isReactQueryEnabled();

    expect(result).toBe(false);

    // Restore
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY = originalEnv;
    }
  });

  it('should return true when flag is set to "true"', async () => {
    const { isReactQueryEnabled } = await import('@/hooks/queries/feature-flag');

    const originalEnv = process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY;
    process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY = 'true';

    const result = isReactQueryEnabled();

    expect(result).toBe(true);

    // Restore
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY;
    }
  });

  it('should return false when flag is set to "false"', async () => {
    const { isReactQueryEnabled } = await import('@/hooks/queries/feature-flag');

    const originalEnv = process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY;
    process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY = 'false';

    const result = isReactQueryEnabled();

    expect(result).toBe(false);

    // Restore
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY;
    }
  });
});
