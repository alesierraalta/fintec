import { createServerAppRepository } from '@/repositories/factory';
import { getRedisClient } from '@/lib/redis/client';
import { ServerReadCache } from '@/lib/cache/server-read-cache';
import { RequestContext } from '@/lib/cache/request-context';
import { createClient } from '@/lib/supabase/server';
import { AppRepository } from '@/repositories/contracts';
import { User } from '@supabase/supabase-js';

export interface ServerRepositoryBundle {
  repository: AppRepository;
  user: User | null;
}

/**
 * Creates a fully configured AppRepository for server-side use.
 * Automatically injects the Supabase client, RequestContext (if user is authenticated),
 * and the ServerReadCache (Redis).
 *
 * Returns both the repository and the authenticated user (if any).
 */
export async function getServerRepository(): Promise<ServerRepositoryBundle> {
  const supabase = await createClient();

  // Try to get the current user for RequestContext
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const requestContext = user
    ? new RequestContext(user.id)
    : new RequestContext('anonymous');

  // Initialize the shared read cache (Redis)
  const redisClient = getRedisClient();
  const readCache = new ServerReadCache(redisClient);

  const repository = createServerAppRepository({
    supabase,
    requestContext,
    readCache,
  });

  return { repository, user };
}
