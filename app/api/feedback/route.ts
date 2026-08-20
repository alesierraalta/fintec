import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/api-middleware';
import { successResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors/app-error';
import { AuthError } from '@/lib/errors/auth-error';
import { FeedbackSchema } from '@/lib/validations/schemas';
import { createServerFeedbacksRepository } from '@/repositories/factory';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AuthError('Unauthorized');

  const body = await request.json();
  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('Validation failed', 'VALIDATION_ERROR', 400, {
      issues: parsed.error.format(),
    });
  }

  const dto = {
    ...parsed.data,
    comment: parsed.data.comment?.trim() || null,
  };

  const repo = createServerFeedbacksRepository({ supabase });

  try {
    const fb = await repo.create(user.id, dto);
    return NextResponse.json(successResponse({ id: fb.id, created_at: fb.created_at }), { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === '23505') {
      const existing = await repo.findByUserAndTarget(user.id, dto.target_type, dto.target_id);
      if (existing) {
        return NextResponse.json(successResponse({ id: existing.id, created_at: existing.created_at }), { status: 200 });
      }
      return NextResponse.json(successResponse(null), { status: 200 });
    }
    throw err;
  }
});
