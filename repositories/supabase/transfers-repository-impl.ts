import type { RequestContext } from '@/lib/cache/request-context';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateTransferInput,
  CreateTransferResult,
  TransferFilters,
  TransferRecord,
  TransfersRepository,
} from '@/repositories/contracts';
import { mapSupabaseTransactionToDomain } from './mappers';
import { supabase } from './client';
import { getOwnedAccountScope, hasOwnedAccounts } from './account-scope';
import { getMemoizedOwnedAccountScope } from './memoized-account-scope';
import {
  TRANSFER_TRANSACTION_LIST_PROJECTION,
  TRANSFER_TRANSACTION_DELETE_PROJECTION,
  TRANSFER_ACCOUNT_NAME_PROJECTION,
} from './transfer-projections';

export class SupabaseTransfersRepository implements TransfersRepository {
  private readonly client: SupabaseClient;
  private readonly requestContext?: RequestContext;

  constructor(client?: SupabaseClient, requestContext?: RequestContext) {
    this.client = client || supabase;
    this.requestContext = requestContext;
  }

  private async getAccountScope(userId: string) {
    if (this.requestContext && this.requestContext.userId === userId) {
      return getMemoizedOwnedAccountScope(this.requestContext, this.client);
    }

    return getOwnedAccountScope(this.client, userId);
  }

  async listByUserId(
    userId: string,
    filters?: TransferFilters
  ): Promise<TransferRecord[]> {
    const scope = await this.getAccountScope(userId);
    if (!hasOwnedAccounts(scope)) {
      return [];
    }

    const projectionFields = TRANSFER_TRANSACTION_LIST_PROJECTION.join(', ');
    const accountProjection = TRANSFER_ACCOUNT_NAME_PROJECTION.join(', ');

    let query = this.client
      .from('transactions')
      .select(`${projectionFields}, account:accounts(${accountProjection})`)
      .in('account_id', scope.accountIds)
      .in('type', ['TRANSFER_OUT', 'TRANSFER_IN'])
      .not('transfer_id', 'is', null)
      .order('date', { ascending: false });

    if (filters?.accountId) {
      query = query.eq('account_id', filters.accountId);
    }

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transfers: ${error.message}`);
    }

    const grouped = new Map<
      string,
      (ReturnType<typeof mapSupabaseTransactionToDomain> & {
        accountName?: string;
      })[]
    >();

    for (const row of (data as any[]) || []) {
      const mapped = mapSupabaseTransactionToDomain(row) as ReturnType<
        typeof mapSupabaseTransactionToDomain
      > & { accountName?: string };
      if (row.account && row.account.name) {
        mapped.accountName = row.account.name;
      }

      if (!mapped.transferId) {
        continue;
      }

      if (!grouped.has(mapped.transferId)) {
        grouped.set(mapped.transferId, []);
      }

      grouped.get(mapped.transferId)!.push(mapped);
    }

    const transferIds = Array.from(grouped.keys());
    let feeByTransfer = new Map<string, number | undefined>();
    if (transferIds.length > 0) {
      const { data: transfersData } = await this.client
        .from('transfers')
        .select('id, fee_minor')
        .in('id', transferIds);
      for (const row of (transfersData as any[]) || []) {
        const fee = row.fee_minor;
        if (fee !== null && fee !== undefined) {
          feeByTransfer.set(row.id, fee);
        }
      }
    }

    return Array.from(grouped.entries()).map(([transferId, transactions]) => {
      const fromTransaction =
        transactions.find((t) => t.type === 'TRANSFER_OUT') || null;
      const toTransaction =
        transactions.find((t) => t.type === 'TRANSFER_IN') || null;
      const commissionMinor = feeByTransfer.get(transferId);
      const amountMinor = fromTransaction?.amountMinor || toTransaction?.amountMinor || 0;
      const totalDebitMinor = commissionMinor !== undefined ? amountMinor + commissionMinor : amountMinor;

      return {
        id: transferId,
        fromTransaction,
        toTransaction,
        amountMinor,
        date: fromTransaction?.date || toTransaction?.date,
        description: fromTransaction?.description || toTransaction?.description,
        commissionMinor,
        totalDebitMinor,
      };
    });
  }

  async create(
    userId: string,
    input: CreateTransferInput
  ): Promise<CreateTransferResult> {
    const amountMajor = input.amountMajor;
    if (
      typeof amountMajor !== 'number' ||
      !Number.isFinite(amountMajor) ||
      amountMajor <= 0
    ) {
      throw new Error('amountMajor must be a positive finite number');
    }

    let commissionMinor: number | null = null;
    if (input.commissionMinor !== undefined && input.commissionMinor !== null) {
      if (!Number.isSafeInteger(input.commissionMinor) || input.commissionMinor < 0) {
        throw new Error('commissionMinor must be a non-negative safe integer');
      }
      commissionMinor = input.commissionMinor;
    } else if (input.commissionMajor !== undefined && input.commissionMajor !== null && String(input.commissionMajor).trim() !== '') {
      const raw = input.commissionMajor;
      if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
        throw new Error('commissionMajor must be a non-negative finite number');
      }
      // Convert using source account currency decimals when possible; fallback to 2
      try {
        const { data: accForCommission } = await this.client
          .from('accounts')
          .select('id, currency_code')
          .eq('id', input.fromAccountId)
          .single();
        const currencyCode = (accForCommission as any)?.currency_code || 'USD';
        const { toMinorUnits } = await import('@/lib/money');
        commissionMinor = toMinorUnits(raw, currencyCode);
      } catch {
        commissionMinor = Math.round(raw * 100);
      }
      if (!Number.isSafeInteger(commissionMinor!)) throw new Error('commission overflows');
    }

    // Resolve effective exchange rate: force 1 for same-currency transfers
    let effectiveRate: number | undefined = input.exchangeRate;
    try {
      const scope = await this.getAccountScope(userId);
      // Fetch accounts to determine currencies if possible
      const { data: accounts } = await this.client
        .from('accounts')
        .select('id, currency_code')
        .in('id', [input.fromAccountId, input.toAccountId]);
      const fromAcc = (accounts as any[])?.find((a) => a.id === input.fromAccountId);
      const toAcc = (accounts as any[])?.find((a) => a.id === input.toAccountId);
      if (fromAcc && toAcc && fromAcc.currency_code === toAcc.currency_code) {
        effectiveRate = 1;
      } else if (effectiveRate === undefined || effectiveRate === null) {
        effectiveRate = 1;
      } else if (typeof effectiveRate !== 'number' || !Number.isFinite(effectiveRate) || effectiveRate <= 0) {
        throw new Error('exchangeRate must be a positive finite number');
      }
    } catch (e) {
      if ((e as Error).message?.includes('exchangeRate')) throw e;
      // Fallback: use provided rate or 1
      if (effectiveRate === undefined || effectiveRate === null) effectiveRate = 1;
      if (typeof effectiveRate !== 'number' || !Number.isFinite(effectiveRate) || effectiveRate <= 0) {
        throw new Error('exchangeRate must be a positive finite number');
      }
    }

    const exchangeRate = effectiveRate;

    let data: any;
    let error: any;
    // Try new 10-param signature first; fallback to legacy 9-param if PostgREST still has old schema cache
    {
      const res: any = await (this.client as any).rpc('create_transfer', {
        p_user_id: userId,
        p_from_account_id: input.fromAccountId,
        p_to_account_id: input.toAccountId,
        p_amount_major: amountMajor,
        p_description: input.description || 'Transferencia',
        p_date: input.date || new Date().toISOString().split('T')[0],
        p_exchange_rate: exchangeRate,
        p_rate_source: input.rateSource || null,
        p_commission_minor: commissionMinor,
      });
      data = res.data;
      error = res.error;
      const msg = error?.message || '';
      const needsFallback =
        !!error &&
        (msg.includes('Node cannot be found') ||
          msg.includes('PGRST') ||
          msg.toLowerCase().includes('could not find the function') ||
          msg.includes('schema cache'));
      if (needsFallback) {
        const fallback: any = await (this.client as any).rpc('create_transfer', {
          p_user_id: userId,
          p_from_account_id: input.fromAccountId,
          p_to_account_id: input.toAccountId,
          p_amount_major: amountMajor,
          p_description: input.description || 'Transferencia',
          p_date: input.date || new Date().toISOString().split('T')[0],
          p_exchange_rate: exchangeRate,
          p_rate_source: input.rateSource || null,
        });
        // If fallback succeeded, use it and drop commission (will be stored as NULL until migration)
        if (!fallback.error) {
          data = fallback.data;
          error = null;
          if (commissionMinor !== null && commissionMinor !== undefined && commissionMinor !== 0) {
            console.warn('[transfers] commission ignored — legacy create_transfer without p_commission_minor, apply migration 20260828120000');
          }
        }
      }
    }

    if (error) {
      if (error.message && error.message.includes('Node cannot be found')) {
        throw new Error(
          'create_transfer RPC is not available — check that the migration was applied and PostgREST schema is up to date'
        );
      }

      throw new Error(error.message || 'Failed to create transfer');
    }

    if (!data) {
      throw new Error('Transfer RPC did not return data');
    }

    return {
      transferId: data.transferId || data.transfer_id || '',
      fromTransactionId: data.fromTransactionId || data.from_transaction_id,
      toTransactionId: data.toTransactionId || data.to_transaction_id,
      fromAmount: data.fromAmount || data.from_amount,
      toAmount: data.toAmount || data.to_amount,
      fromCurrency: data.fromCurrency || data.from_currency,
      toCurrency: data.toCurrency || data.to_currency,
      exchangeRate: data.exchangeRate || data.exchange_rate,
      commissionMinor: data.commissionMinor ?? data.commission_minor ?? data.feeMinor ?? data.fee_minor ?? commissionMinor ?? undefined,
      totalDebitMinor: data.totalDebitMinor ?? data.total_debit_minor ?? undefined,
    };
  }

  async delete(userId: string, transferId: string): Promise<void> {
    const scope = await this.getAccountScope(userId);
    if (!hasOwnedAccounts(scope)) {
      throw new Error('Transfer not found');
    }

    const { data, error } = await this.client
      .from('transactions')
      .select(TRANSFER_TRANSACTION_DELETE_PROJECTION.join(', '))
      .in('account_id', scope.accountIds)
      .eq('transfer_id', transferId);

    if (error) {
      throw new Error(`Failed to find transfer transactions: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Transfer not found');
    }

    for (const transaction of data as any[]) {
      const { error: deleteError } = await (this.client as any).rpc(
        'delete_transaction_and_adjust_balance',
        {
          transaction_id_input: transaction.id,
        }
      );

      if (deleteError) {
        throw new Error(
          `Failed to delete transfer transaction: ${deleteError.message}`
        );
      }
    }
  }
}
