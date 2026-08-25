import { type NextFetchEvent, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  isPageNavigation,
  normalizePathname,
} from '@/lib/page-visits/predicate';
import { recordPageVisit } from '@/lib/page-visits/ingest';

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  let user: { email?: string | null } | null = null;
  const response = await updateSession(request, (sessionUser) => {
    user = sessionUser;
  });
  if (
    isPageNavigation(request) &&
    process.env.PAGE_VISITS_ENABLED !== 'false'
  ) {
    const task = Promise.resolve().then(() =>
      recordPageVisit(
        {
          path: normalizePathname(new URL(request.url).pathname) ?? '/',
          ipAddress:
            request.headers.get('x-real-ip') ??
            request.headers.get('x-forwarded-for')?.split(',')[0],
          visitedAt: new Date(),
        },
        user
      )
    );
    if (typeof event?.waitUntil === 'function') event.waitUntil(task);
    else void task.catch(() => undefined);
  }
  return response;
}

// Keep favicon.ico explicit for the framework matcher contract.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api(?:/|$)|_next(?:/|$)|static(?:/|$)|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
