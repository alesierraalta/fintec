/**
 * Single source of truth for legal metadata.
 *
 * Legal documents must be versioned and dated statically: a rendered
 * `new Date()` would claim the document changed every day, destroying the
 * evidentiary value of "the user accepted version X on date Y".
 *
 * When a legal document changes materially:
 *   1. Bump its `version` (semver-like, string).
 *   2. Set `effectiveDate` to the publication date (ISO `YYYY-MM-DD`).
 *   3. Users are re-prompted for acceptance on next authenticated load.
 */

export interface LegalDocumentVersion {
  /** Stable identifier persisted alongside every acceptance record. */
  readonly id: LegalDocumentId;
  /** Human-readable version, e.g. "1.0". */
  readonly version: string;
  /** ISO date (YYYY-MM-DD) the version took effect. */
  readonly effectiveDate: string;
}

export type LegalDocumentId = 'terms' | 'privacy';

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocumentVersion> = {
  terms: {
    id: 'terms',
    version: '1.0',
    effectiveDate: '2026-08-05',
  },
  privacy: {
    id: 'privacy',
    version: '1.0',
    effectiveDate: '2026-08-05',
  },
} as const;

/**
 * Composite version stamped on an acceptance record. Any bump to either
 * document invalidates prior acceptances and requires re-consent.
 */
export const CURRENT_LEGAL_VERSION = `terms-${LEGAL_DOCUMENTS.terms.version}/privacy-${LEGAL_DOCUMENTS.privacy.version}`;

/**
 * Legal entity and contact details.
 *
 * TODO(legal): replace every `PENDING_*` placeholder with the registered
 * company details before public launch. Data-protection law requires the
 * controller to be identifiable, and the contact channels below must be
 * mailboxes that are actually monitored.
 */
export const LEGAL_ENTITY = {
  /** Registered company name acting as data controller. */
  name: 'PENDING_LEGAL_ENTITY_NAME',
  /** Registered address of the controller. */
  address: 'PENDING_REGISTERED_ADDRESS',
  /** Company registration / tax identifier. */
  registrationId: 'PENDING_REGISTRATION_ID',
  /** Country whose law governs the terms. */
  governingLawCountry: 'PENDING_GOVERNING_LAW_COUNTRY',
  /** Venue for disputes. */
  jurisdiction: 'PENDING_JURISDICTION',
  /** Commercial / product name shown to users. */
  productName: 'FinTec',
} as const;

export const LEGAL_CONTACTS = {
  privacy: 'PENDING_PRIVACY_EMAIL',
  support: 'PENDING_SUPPORT_EMAIL',
} as const;

/** True while any placeholder is still unresolved. */
export function hasUnresolvedLegalPlaceholders(): boolean {
  const values = [
    ...Object.values(LEGAL_ENTITY),
    ...Object.values(LEGAL_CONTACTS),
  ];
  return values.some((value) => value.startsWith('PENDING_'));
}

/** Formats an ISO date for display in the user-facing locale. */
export function formatEffectiveDate(isoDate: string, locale = 'es-ES'): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  // Construct in UTC so the rendered day never shifts by timezone.
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
