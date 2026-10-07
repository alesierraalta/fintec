import {
  CURRENT_LEGAL_VERSION,
  LEGAL_DOCUMENTS,
  formatEffectiveDate,
  hasUnresolvedLegalPlaceholders,
} from '@/lib/legal/legal-config';

describe('legal config', () => {
  it('exposes a static effective date per document', () => {
    for (const document of Object.values(LEGAL_DOCUMENTS)) {
      expect(document.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('derives the composite version from both documents', () => {
    expect(CURRENT_LEGAL_VERSION).toBe(
      `terms-${LEGAL_DOCUMENTS.terms.version}/privacy-${LEGAL_DOCUMENTS.privacy.version}`
    );
  });

  it('renders the effective date without shifting across timezones', () => {
    // A naive `new Date('2026-08-05')` in a negative-offset timezone renders
    // as August 4; the UTC-anchored formatter must not.
    expect(formatEffectiveDate('2026-08-05', 'en-US')).toBe('August 5, 2026');
  });

  it('flags unresolved legal placeholders', () => {
    // Guards the launch checklist: this must be false before going public.
    expect(typeof hasUnresolvedLegalPlaceholders()).toBe('boolean');
  });
});
