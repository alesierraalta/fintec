import { logger } from '@/lib/utils/logger';

export type LegalAcceptanceSource = 'signup' | 'oauth' | 're-consent';

/**
 * Records the current legal acceptance for the authenticated user.
 *
 * Best-effort by design: the durable proof of consent at signup is the
 * `legal_acceptance` metadata attached to the auth user, which is written
 * atomically with account creation. This call adds the queryable ledger row
 * and is safe to retry, so a transient failure must never block the user
 * from completing registration.
 */
export async function recordLegalAcceptance(
  source: LegalAcceptanceSource
): Promise<boolean> {
  try {
    const response = await fetch('/api/legal/acceptance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    });
    return response.ok;
  } catch (error) {
    logger.warn('Could not record legal acceptance', { source, error });
    return false;
  }
}
