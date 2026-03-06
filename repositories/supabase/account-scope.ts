import type { SupabaseClient } from '@supabase/supabase-js';

export interface OwnedAccountScope {
  userId: string;
  accountIds: string[];
}

export async function getOwnedAccountScope(
  client: SupabaseClient,
  userId: string
): Promise<OwnedAccountScope> {
  const { data, error } = await client
    .from('accounts')
    .select('id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch user accounts: ${error.message}`);
  }

  return {
    userId,
    accountIds: ((data as Array<{ id: string }> | null) ?? []).map(
      (account) => account.id
    ),
  };
}

export function intersectOwnedAccountIds(
  ownedAccountIds: string[],
  requestedAccountIds?: string[]
): string[] {
  if (!requestedAccountIds || requestedAccountIds.length === 0) {
    return ownedAccountIds;
  }

  const ownedSet = new Set(ownedAccountIds);
  return requestedAccountIds.filter((accountId) => ownedSet.has(accountId));
}

export function hasOwnedAccounts(scope: OwnedAccountScope): boolean {
  return scope.accountIds.length > 0;
}
