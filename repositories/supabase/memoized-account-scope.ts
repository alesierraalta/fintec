import type { RequestContext } from '@/lib/cache/request-context';
import { isBackendRequestMemoEnabled } from '@/lib/backend/feature-flags';
import {
  getOwnedAccountScope,
  type OwnedAccountScope,
} from '@/repositories/supabase/account-scope';

export const OWNED_ACCOUNT_SCOPE_CACHE_PREFIX = 'ownedAccountScope:';

export function getOwnedAccountScopeCacheKey(userId: string): string {
  return `${OWNED_ACCOUNT_SCOPE_CACHE_PREFIX}${userId}`;
}

export function invalidateMemoizedOwnedAccountScope(
  context: RequestContext,
  userId: string = context.userId
): void {
  context.deleteMemoKey(getOwnedAccountScopeCacheKey(userId));
}

/**
 * Memoized version of getOwnedAccountScope that uses RequestContext for per-request dedup.
 * This avoids redundant DB queries when the same scope is needed multiple times per request.
 */
export async function getMemoizedOwnedAccountScope(
  context: RequestContext,
  supabase: any // SupabaseClient — imported at runtime to avoid circular deps
): Promise<OwnedAccountScope> {
  if (!isBackendRequestMemoEnabled()) {
    return getOwnedAccountScope(supabase, context.userId);
  }

  const cacheKey = getOwnedAccountScopeCacheKey(context.userId);

  return context.memoizeOrComputeAsync(cacheKey, async () => {
    return getOwnedAccountScope(supabase, context.userId);
  });
}
