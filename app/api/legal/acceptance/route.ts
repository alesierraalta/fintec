import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import {
  CURRENT_LEGAL_VERSION,
  LEGAL_DOCUMENTS,
} from '@/lib/legal/legal-config';

const VALID_SOURCES = ['signup', 'oauth', 're-consent'] as const;
type AcceptanceSource = (typeof VALID_SOURCES)[number];

/**
 * Reports whether the authenticated user has accepted the current legal
 * version. Consumers use this to gate the app behind a re-consent prompt
 * after a material change to the Terms or Privacy Policy.
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

  const { data, error } = await supabase
    .from('legal_acceptances')
    .select('legal_version, accepted_at')
    .eq('user_id', user.id)
    .eq('legal_version', CURRENT_LEGAL_VERSION)
    .maybeSingle();

  if (error) {
    logger.error('Failed to read legal acceptance', {
      userId: user.id,
      error,
    });
    return NextResponse.json(
      { error: 'Failed to read legal acceptance' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    currentVersion: CURRENT_LEGAL_VERSION,
    accepted: Boolean(data),
    acceptedAt: data?.accepted_at ?? null,
  });
}

/**
 * Records acceptance of the current legal version. Idempotent: re-submitting
 * the same version for the same user is a no-op, so a retried request never
 * duplicates the consent record.
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

  let source: AcceptanceSource = 're-consent';
  try {
    const body = await request.json();
    if (VALID_SOURCES.includes(body?.source)) {
      source = body.source;
    }
  } catch {
    // Empty or malformed body falls back to the default source.
  }

  const { error } = await supabase.from('legal_acceptances').upsert(
    {
      user_id: user.id,
      legal_version: CURRENT_LEGAL_VERSION,
      terms_version: LEGAL_DOCUMENTS.terms.version,
      privacy_version: LEGAL_DOCUMENTS.privacy.version,
      source,
      user_agent: request.headers.get('user-agent'),
    },
    { onConflict: 'user_id,legal_version', ignoreDuplicates: true }
  );

  if (error) {
    logger.error('Failed to record legal acceptance', {
      userId: user.id,
      error,
    });
    return NextResponse.json(
      { error: 'Failed to record legal acceptance' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    legalVersion: CURRENT_LEGAL_VERSION,
  });
}
