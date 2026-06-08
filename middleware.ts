import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Edge middleware — runs on every matched request before the route handler.
 *
 * Error handling lives at the ROUTE level via the `withErrorHandling` wrapper
 * in each API route (see lib/api-middleware.ts). This middleware only handles
 * session/auth plumbing; API errors are caught and formatted by the route layer.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
