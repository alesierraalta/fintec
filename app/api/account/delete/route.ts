import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { purgeUserData } from '@/lib/legal/user-data';
import { logger } from '@/lib/utils/logger';

/** Typed confirmation required to proceed; guards against accidental calls. */
const CONFIRMATION_TEXT = 'ELIMINAR CUENTA';

/**
 * POST /api/account/delete
 *
 * Right to erasure. Deletes all user records and then the auth identity
 * itself — clearing data while leaving the account alive would not satisfy
 * an erasure request.
 *
 * Deleting the auth user requires the service role, so this route is the
 * only place account erasure can happen.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let confirmationText: unknown;
  try {
    const body = await request.json();
    confirmationText = body?.confirmationText;
  } catch {
    confirmationText = undefined;
  }

  if (confirmationText !== CONFIRMATION_TEXT) {
    return NextResponse.json(
      { error: 'Confirmation text does not match. Operation cancelled.' },
      { status: 400 }
    );
  }

  try {
    const deleted = await purgeUserData(supabase, user.id);

    // Data is gone; now remove the identity. If this fails the request must
    // report failure, otherwise the user is told they were erased when the
    // account still exists.
    const admin = createServiceClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      logger.error('Failed to delete auth user', {
        userId: user.id,
        error: deleteError,
      });
      return NextResponse.json(
        {
          success: false,
          error:
            'Your data was deleted but the account could not be removed. Contact support.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedAt: new Date().toISOString(),
      deleted,
    });
  } catch (error) {
    logger.error('Failed to delete account', { userId: user.id, error });
    return NextResponse.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
