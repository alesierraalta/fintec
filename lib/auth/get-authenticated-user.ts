import { cache } from 'react';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AuthError } from '@/lib/errors/auth-error';

/**
 * Extracts and validates the authenticated user from the current request context.
 * Uses the project-standard Supabase server client (lib/supabase/server.ts)
 * which reads auth state from cookies/headers via next/headers automatically.
 *
 * The `_request` parameter is kept for call-site compatibility during migration.
 * Auth context is obtained from next/headers (not from the request object directly).
 *
 * Wrapped in React cache() to memoize the result across multiple calls
 * within the same request lifecycle (avoids redundant network round-trips).
 *
 * @param _request - Unused; kept for call-site compatibility
 * @returns The authenticated user ID
 * @throws AuthError if no valid session exists (statusCode 401)
 *
 * @example
 * ```typescript
 * // Callers should use withErrorHandling — AuthError is caught and mapped to 401 automatically.
 * export const GET = withErrorHandling(async (request: NextRequest) => {
 *   const userId = await getAuthenticatedUser(request);
 *   return NextResponse.json(successResponse({ userId }));
 * });
 * ```
 */
const _getAuthenticatedUserCached = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError('Authentication failed');
  }

  return user.id;
});

export async function getAuthenticatedUser(
  _request?: NextRequest
): Promise<string> {
  return _getAuthenticatedUserCached();
}
