import { createServiceClient } from '@/lib/supabase/admin';
import { isTestUserEmail } from '@/lib/admin/test-users';
import { createDailyVisitorHash, normalizeIp } from './hash';
import { normalizePathname } from './predicate';
import type { PageVisitInput } from './types';

export type VisitUser = { email?: string | null } | null;

export async function recordPageVisit(
  input: PageVisitInput,
  user?: VisitUser
): Promise<void> {
  try {
    if (user?.email && isTestUserEmail(user.email)) return;
    const secret = process.env.PAGE_VISITS_HMAC_SECRET;
    if (!secret || process.env.PAGE_VISITS_ENABLED === 'false') return;
    const path = normalizePathname(input.path);
    if (!path) return;
    const visitedAt = input.visitedAt ?? new Date();
    const date = visitedAt.toISOString().slice(0, 10);
    const source = normalizeIp(input.ipAddress) ?? 'anonymous';
    const ip_hash = await createDailyVisitorHash(secret, source, date);
    const country_code =
      input.countryCode && /^[A-Za-z]{2}$/.test(input.countryCode)
        ? input.countryCode.toUpperCase()
        : undefined;
    const client = createServiceClient();
    const payload = {
      path,
      visited_at: visitedAt.toISOString(),
      ip_hash,
      ...(country_code ? { country_code } : {}),
    };
    await client.from('page_visits').insert(payload as never);
  } catch {
    // Analytics must never affect navigation or expose request data.
  }
}
