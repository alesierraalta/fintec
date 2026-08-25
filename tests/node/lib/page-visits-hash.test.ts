import { createDailyVisitorHash, normalizeIp } from '@/lib/page-visits/hash';

describe('page visit privacy hash', () => {
  it('normalizes IPs and produces a date-scoped HMAC', async () => {
    expect(normalizeIp('  ::ffff:192.0.2.1 ')).toBe('192.0.2.1');
    await expect(
      createDailyVisitorHash('secret', '192.0.2.1', '2026-01-02')
    ).resolves.toHaveLength(64);
    await expect(
      createDailyVisitorHash('secret', '192.0.2.1', '2026-01-02')
    ).resolves.toBe(
      await createDailyVisitorHash('secret', '192.0.2.1', '2026-01-02')
    );
    await expect(
      createDailyVisitorHash('secret', '192.0.2.1', '2026-01-03')
    ).resolves.not.toBe(
      await createDailyVisitorHash('secret', '192.0.2.1', '2026-01-02')
    );
  });
});
