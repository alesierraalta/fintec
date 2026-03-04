import { DebtDirection, DebtStatus } from '@/types';
import { SupabaseTransactionsRepository } from '@/repositories/supabase/transactions-repository-impl';
import { LocalTransactionsRepository } from '@/repositories/local/transactions-repository-impl';

describe('transactions repository debt parity', () => {
  it('forwards identical debt filters in findDebts', async () => {
    const supabaseRepo = new SupabaseTransactionsRepository({} as any);
    const localRepo = new LocalTransactionsRepository();

    const supabaseFindByFiltersSpy = jest
      .spyOn(supabaseRepo, 'findByFilters')
      .mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    const localFindByFiltersSpy = jest
      .spyOn(localRepo, 'findByFilters')
      .mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

    const filters = {
      accountIds: ['acc-1'],
      dateFrom: '2026-01-01',
      dateTo: '2026-03-01',
      debtDirection: DebtDirection.OWE,
      debtStatus: DebtStatus.SETTLED,
    };

    await supabaseRepo.findDebts(filters, { page: 2, limit: 25 });
    await localRepo.findDebts(filters, { page: 2, limit: 25 });

    expect(supabaseFindByFiltersSpy).toHaveBeenCalledWith(
      {
        accountIds: ['acc-1'],
        dateFrom: '2026-01-01',
        dateTo: '2026-03-01',
        debtMode: 'ONLY_DEBT',
        debtDirection: DebtDirection.OWE,
        debtStatus: DebtStatus.SETTLED,
      },
      { page: 2, limit: 25 }
    );

    expect(localFindByFiltersSpy).toHaveBeenCalledWith(
      {
        accountIds: ['acc-1'],
        dateFrom: '2026-01-01',
        dateTo: '2026-03-01',
        debtMode: 'ONLY_DEBT',
        debtDirection: DebtDirection.OWE,
        debtStatus: DebtStatus.SETTLED,
      },
      { page: 2, limit: 25 }
    );
  });

  it('computes identical OPEN-only debt summary totals', async () => {
    const sampleOpenDebts = [
      {
        id: 'd-1',
        debtDirection: 'OWE',
        amountBaseMinor: 2500,
      },
      {
        id: 'd-2',
        debtDirection: 'OWED_TO_ME',
        amountBaseMinor: 4000,
      },
      {
        id: 'd-3',
        debtDirection: 'OWE',
        amountBaseMinor: 1000,
      },
    ] as any[];

    const supabaseRepo = new SupabaseTransactionsRepository({} as any);
    const localRepo = new LocalTransactionsRepository();

    const supabaseFindDebtsSpy = jest
      .spyOn(supabaseRepo, 'findDebts')
      .mockResolvedValue({
        data: sampleOpenDebts as any,
        total: sampleOpenDebts.length,
        page: 1,
        limit: 500,
        totalPages: 1,
      });
    const localFindDebtsSpy = jest
      .spyOn(localRepo, 'findDebts')
      .mockResolvedValue({
        data: sampleOpenDebts as any,
        total: sampleOpenDebts.length,
        page: 1,
        limit: 500,
        totalPages: 1,
      });

    const [supabaseSummary, localSummary] = await Promise.all([
      supabaseRepo.getDebtSummary({ accountIds: ['acc-1'] }),
      localRepo.getDebtSummary({ accountIds: ['acc-1'] }),
    ]);

    expect(supabaseFindDebtsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        accountIds: ['acc-1'],
        debtStatus: DebtStatus.OPEN,
      }),
      expect.objectContaining({ limit: 500 })
    );
    expect(localFindDebtsSpy).toHaveBeenCalledWith({
      accountIds: ['acc-1'],
      dateFrom: undefined,
      dateTo: undefined,
      debtStatus: DebtStatus.OPEN,
    });

    const expected = {
      totalOweBaseMinor: 3500,
      totalOwedToMeBaseMinor: 4000,
      netDebtBaseMinor: 500,
      openCount: 3,
    };

    expect(supabaseSummary).toEqual(expected);
    expect(localSummary).toEqual(expected);
  });
});
