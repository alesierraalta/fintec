import { NextRequest, NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { AppError } from './errors/app-error';
import { errorResponse } from './api-response';

type ApiHandler<Ctx extends unknown[] = []> = (
  request: NextRequest,
  ...ctx: Ctx
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with standardized error handling.
 * Catches AppError subclasses and returns consistent envelope responses.
 * Catches unknown errors and returns 500 INTERNAL_ERROR.
 *
 * Supports variadic Ctx for dynamic routes:
 *   - 0-arg route: withErrorHandling(async (req) => {…})
 *   - Dynamic route: withErrorHandling(async (req, { params }) => {…})
 *
 * Calls unstable_rethrow() before any custom handling to ensure Next.js
 * internal errors (redirects, notFound) propagate correctly.
 */
export function withErrorHandling<Ctx extends unknown[] = []>(
  handler: ApiHandler<Ctx>
): ApiHandler<Ctx> {
  return async (request: NextRequest, ...ctx: Ctx) => {
    try {
      return await handler(request, ...ctx);
    } catch (error) {
      // Allow Next.js internal errors (redirect, notFound…) to propagate
      unstable_rethrow(error);

      if (error instanceof AppError) {
        const envelope = errorResponse(error);
        return NextResponse.json(envelope, { status: error.statusCode });
      }

      // Unknown error — log for observability then return generic 500
      console.error('[withErrorHandling] unhandled error:', error);
      const envelope = errorResponse(
        new AppError('An unexpected error occurred', 'INTERNAL_ERROR', 500)
      );
      return NextResponse.json(envelope, { status: 500 });
    }
  };
}
