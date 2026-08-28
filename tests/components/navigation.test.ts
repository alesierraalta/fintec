import { mobilePrimaryNavigation, mobileSecondaryNavigation } from '@/components/layout/navigation';

describe('mobile navigation route roles', () => {
  it('keeps exactly five primary routes in order', () => {
    expect(mobilePrimaryNavigation.map((item) => [item.href, item.mobileLabel])).toEqual([
      ['/', 'Inicio'], ['/accounts', 'Cuentas'], ['/transactions', 'Transacciones'],
      ['/transfers', 'Transferir'], ['/goals', 'Metas'],
    ]);
  });

  it('keeps secondary routes complementary', () => {
    expect(mobileSecondaryNavigation.map((item) => item.href)).toEqual([
      '/recurring', '/categories', '/budgets', '/reports', '/calculator', '/debts',
      '/p2p-offers', '/backups', '/chat', '/settings',
    ]);
    expect(mobileSecondaryNavigation.some((item) => item.href === '/goals')).toBe(false);
    expect(mobileSecondaryNavigation.some((item) => item.href === '/pricing')).toBe(false);
  });
});
