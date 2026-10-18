import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { collectUserData } from '@/lib/legal/user-data';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/account/export
 *
 * Data-subject access and portability request: returns every record tied to
 * the authenticated user as a downloadable JSON document.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await collectUserData(supabase, user.id, {
      email: user.email,
      createdAt: user.created_at,
    });

    const filename = `fintec-export-${payload.exportedAt.slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('Failed to export user data', { userId: user.id, error });
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}
