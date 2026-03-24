import { NextResponse } from 'next/server';
import { ensureCanonicalUserFixtures } from '@/lib/testing/canonical-fixtures';
import { createClient } from '@/lib/supabase/server';
import {
  createServerAppRepository,
  createServerUsersProfileRepository,
} from '@/repositories/factory';

function isTestingBootstrapDisabled() {
  return process.env.NODE_ENV === 'production';
}

export async function POST() {
  if (isTestingBootstrapDisabled()) {
    return NextResponse.json(
      {
        error: 'Testing bootstrap is disabled in production.',
      },
      { status: 403 }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY prerequisite' },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const appRepository = createServerAppRepository({ supabase });
    const usersProfileRepository = createServerUsersProfileRepository({
      supabase,
    });
    const result = await ensureCanonicalUserFixtures({
      authUser: {
        id: user.id,
        email: user.email,
        user_metadata: {
          name:
            typeof user.user_metadata?.name === 'string'
              ? user.user_metadata.name
              : undefined,
        },
      },
      appRepository,
      usersProfileRepository,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Testing bootstrap failed',
      },
      { status: 500 }
    );
  }
}
