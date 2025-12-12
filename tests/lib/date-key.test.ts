import { formatCaracasDayKey } from '@/lib/utils/date-key';

const supportsCaracasTimeZone = (() => {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
      new Date()
    );
    return true;
  } catch {
    return false;
  }
})();

const itIf = supportsCaracasTimeZone ? it : it.skip;

describe('formatCaracasDayKey', () => {
  itIf('uses America/Caracas day boundary', () => {
    // 02:00Z is 22:00 previous day in Caracas (UTC-4)
    expect(formatCaracasDayKey(new Date('2025-12-12T02:00:00.000Z'))).toBe(
      '2025-12-11'
    );

    // 05:00Z is 01:00 same day in Caracas
    expect(formatCaracasDayKey(new Date('2025-12-12T05:00:00.000Z'))).toBe(
      '2025-12-12'
    );
  });
});

