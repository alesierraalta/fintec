import { LocalTransactionsRepository } from '@/repositories/local/transactions-repository-impl';
import { SupabaseTransactionsRepository } from '@/repositories/supabase/transactions-repository-impl';
import {
  mapSupabaseTransactionToDomain,
  mapDomainTransactionToSupabase,
} from '@/repositories/supabase/mappers';
import { DebtStatus, DebtDirection, TransactionType } from '@/types';
import { db } from '@/repositories/local/db';

jest.mock('@/repositories/local/db', () => ({
  db: {
    transaction: jest.fn(async (mode, tables, cb) => cb()),
    transactions: {
      get: jest.fn(),
      put: jest.fn(),
      update: jest.fn(),
      add: jest.fn(),
    },
    accounts: {
      get: jest.fn(),
      update: jest.fn(),
    },
    categories: {
      get: jest.fn(),
    },
    debtSettlements: {
      add: jest.fn(),
    },
  },
}));

describe('Partial Debt Settlements', () => {
  describe('Local Parity', () => {
    let repo: LocalTransactionsRepository;

    beforeEach(() => {
      jest.clearAllMocks();
      repo = new LocalTransactionsRepository();
    });

    it('rejects zero, negative, and fractional amounts', async () => {
      await expect(
        repo.settleDebt({
          debtTransactionId: '1',
          settlementAccountId: '2',
          amountMinor: 0,
          date: '2023-01-01',
        })
      ).rejects.toThrow('Invalid amount');
      await expect(
        repo.settleDebt({
          debtTransactionId: '1',
          settlementAccountId: '2',
          amountMinor: -50,
          date: '2023-01-01',
        })
      ).rejects.toThrow('Invalid amount');
      await expect(
        repo.settleDebt({
          debtTransactionId: '1',
          settlementAccountId: '2',
          amountMinor: 10.5,
          date: '2023-01-01',
        })
      ).rejects.toThrow('Invalid amount');
    });

    it('rejects overpayment and asserts no mutation', async () => {
      (db.transactions.get as jest.Mock).mockResolvedValue({
        id: '1',
        isDebt: true,
        amountMinor: 100,
        remainingAmountMinor: 50,
      });
      await expect(
        repo.settleDebt({
          debtTransactionId: '1',
          settlementAccountId: '2',
          amountMinor: 51,
          date: '2023-01-01',
        })
      ).rejects.toThrow('Settlement amount exceeds remaining debt');

      expect(db.transactions.add).not.toHaveBeenCalled();
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transactions.put).not.toHaveBeenCalled();
      expect(db.debtSettlements.add).not.toHaveBeenCalled();
    });

    it('rejects inactive account', async () => {
      (db.transactions.get as jest.Mock).mockResolvedValue({
        id: '1',
        isDebt: true,
        amountMinor: 100,
        remainingAmountMinor: 50,
        currencyCode: 'USD',
      });
      (db.accounts.get as jest.Mock).mockResolvedValue({
        id: '2',
        active: false,
        currencyCode: 'USD',
      });
      await expect(
        repo.settleDebt({
          debtTransactionId: '1',
          settlementAccountId: '2',
          amountMinor: 10,
          date: '2023-01-01',
        })
      ).rejects.toThrow('Settlement account is not active');
    });

    it('increases balance for OWED_TO_ME partial settlement', async () => {
      const debt = {
        id: '1',
        isDebt: true,
        amountMinor: 100,
        amountBaseMinor: 100,
        remainingAmountMinor: 100,
        remainingAmountBaseMinor: 100,
        paidAmountMinor: 0,
        paidAmountBaseMinor: 0,
        currencyCode: 'USD',
        debtDirection: DebtDirection.OWED_TO_ME,
        exchangeRate: 1,
      };
      const account = {
        id: '2',
        active: true,
        currencyCode: 'USD',
        balance: 500,
      };
      (db.transactions.get as jest.Mock).mockResolvedValue(debt);
      (db.accounts.get as jest.Mock).mockResolvedValue(account);

      await repo.settleDebt({
        debtTransactionId: '1',
        settlementAccountId: '2',
        amountMinor: 40,
        date: '2023-01-01',
      });

      expect(db.accounts.update).toHaveBeenCalledWith('2', { balance: 540 });
      expect(db.transactions.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TransactionType.INCOME,
          amountMinor: 40,
        })
      );
      expect(db.transaction).toHaveBeenCalled();
      expect(debt.remainingAmountMinor).toBe(60);
      expect(debt.debtStatus).not.toBe(DebtStatus.SETTLED);
    });

    it('decreases balance for I_OWE partial settlement', async () => {
      const debt = {
        id: '1',
        isDebt: true,
        amountMinor: 100,
        amountBaseMinor: 100,
        remainingAmountMinor: 100,
        remainingAmountBaseMinor: 100,
        paidAmountMinor: 0,
        paidAmountBaseMinor: 0,
        currencyCode: 'USD',
        debtDirection: DebtDirection.OWE,
        exchangeRate: 1,
      };
      const account = {
        id: '2',
        active: true,
        currencyCode: 'USD',
        balance: 500,
      };
      (db.transactions.get as jest.Mock).mockResolvedValue(debt);
      (db.accounts.get as jest.Mock).mockResolvedValue(account);

      await repo.settleDebt({
        debtTransactionId: '1',
        settlementAccountId: '2',
        amountMinor: 30,
        date: '2023-01-01',
      });

      expect(db.accounts.update).toHaveBeenCalledWith('2', { balance: 470 });
      expect(db.transactions.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TransactionType.EXPENSE,
          amountMinor: 30,
        })
      );
      expect(debt.remainingAmountMinor).toBe(70);
    });

    it('final settlement sets SETTLED and settledAt', async () => {
      const debt = {
        id: '1',
        isDebt: true,
        amountMinor: 100,
        amountBaseMinor: 100,
        remainingAmountMinor: 100,
        remainingAmountBaseMinor: 100,
        paidAmountMinor: 0,
        paidAmountBaseMinor: 0,
        currencyCode: 'USD',
        debtDirection: DebtDirection.OWE,
        exchangeRate: 1,
      };
      const account = {
        id: '2',
        active: true,
        currencyCode: 'USD',
        balance: 500,
      };
      (db.transactions.get as jest.Mock).mockResolvedValue(debt);
      (db.accounts.get as jest.Mock).mockResolvedValue(account);

      await repo.settleDebt({
        debtTransactionId: '1',
        settlementAccountId: '2',
        amountMinor: 100,
        date: '2023-01-01',
      });

      expect(debt.remainingAmountMinor).toBe(0);
      expect(debt.debtStatus).toBe(DebtStatus.SETTLED);
      expect(debt.settledAt).toBeDefined();
    });
  });

  describe('Supabase RPC Parameter Mapping', () => {
    it('calls RPC with correct p_ parameter names', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
      const client = { rpc: mockRpc };
      const repo = new SupabaseTransactionsRepository(client as any);

      await repo
        .settleDebt({
          debtTransactionId: 'd1',
          settlementAccountId: 'a1',
          categoryId: 'c1',
          amountMinor: 500,
          date: '2023-01-01',
          note: 'test note',
        })
        .catch(() => {}); // Catch map error because data is null

      expect(mockRpc).toHaveBeenCalledWith('settle_debt_partial', {
        p_debt_id: 'd1',
        p_account_id: 'a1',
        p_category_id: 'c1',
        p_amount_minor: 500,
        p_date: '2023-01-01',
        p_note: 'test note',
      });
    });
  });

  describe('Legacy fallback in mapper', () => {
    it('maps old OPEN debt with no progress fields', () => {
      const result = mapSupabaseTransactionToDomain({
        id: '1',
        is_debt: true,
        debt_status: 'OPEN',
        amount_minor: 1000,
        amount_base_minor: 1000,
      } as any);
      expect(result.paidAmountMinor).toBe(0);
      expect(result.remainingAmountMinor).toBe(1000);
    });

    it('maps old SETTLED debt with no progress fields', () => {
      const result = mapSupabaseTransactionToDomain({
        id: '1',
        is_debt: true,
        debt_status: 'SETTLED',
        amount_minor: 1000,
        amount_base_minor: 1000,
      } as any);
      expect(result.paidAmountMinor).toBe(1000);
      expect(result.remainingAmountMinor).toBe(0);
    });
  });

  describe('Mapper write payload', () => {
    it('omits generated remaining columns but includes paid columns', () => {
      const result = mapDomainTransactionToSupabase({
        id: '1',
        isDebt: true,
        amountMinor: 1000,
        paidAmountMinor: 400,
        paidAmountBaseMinor: 400,
        remainingAmountMinor: 600,
        remainingAmountBaseMinor: 600,
      });

      expect(result).toHaveProperty('debt_paid_amount_minor', 400);
      expect(result).toHaveProperty('debt_paid_amount_base_minor', 400);
      expect(result).not.toHaveProperty('debt_remaining_amount_minor');
      expect(result).not.toHaveProperty('debt_remaining_amount_base_minor');
    });
  });
});
