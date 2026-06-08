/**
 * Feature flag for React Query migration.
 *
 * Controls whether to use React Query hooks or fall back to useOptimizedData.
 * The flag is read from the NEXT_PUBLIC_FEATURE_REACT_QUERY environment variable.
 *
 * Usage:
 * - Set NEXT_PUBLIC_FEATURE_REACT_QUERY=true to enable React Query
 * - Set NEXT_PUBLIC_FEATURE_REACT_QUERY=false or leave unset to use useOptimizedData
 *
 * This allows gradual rollout and instant rollback if issues are detected.
 */

/**
 * Check if React Query migration is enabled.
 * @returns true if React Query should be used, false otherwise
 */
export function isReactQueryEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_REACT_QUERY === 'true';
}
