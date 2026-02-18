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

export class SupabaseTransfersRepository implements TransfersRepository {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  async listByUserId(
    userId: string,
    filters?: TransferFilters
  ): Promise<TransferRecord[]> {
    let query = this.client
      .from('transactions')
      .select(
        `
        *,
        accounts!inner(user_id)
      `
      )
      .eq('accounts.user_id', userId)
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
      ReturnType<typeof mapSupabaseTransactionToDomain>[]
    >();

    for (const row of data || []) {
      const mapped = mapSupabaseTransactionToDomain(row as any);
      if (!mapped.transferId) {
        continue;
      }

      if (!grouped.has(mapped.transferId)) {
        grouped.set(mapped.transferId, []);
      }

      grouped.get(mapped.transferId)!.push(mapped);
    }

    return Array.from(grouped.entries()).map(([transferId, transactions]) => {
      const fromTransaction =
        transactions.find((t) => t.type === 'TRANSFER_OUT') || null;
      const toTransaction =
        transactions.find((t) => t.type === 'TRANSFER_IN') || null;

      return {
        id: transferId,
        fromTransaction,
        toTransaction,
        amountMinor:
          fromTransaction?.amountMinor || toTransaction?.amountMinor || 0,
        date: fromTransaction?.date || toTransaction?.date,
        description: fromTransaction?.description || toTransaction?.description,
      };
    });
  }

  async create(
    userId: string,
    input: CreateTransferInput
  ): Promise<CreateTransferResult> {
    const exchangeRate =
      input.exchangeRate != null &&
      typeof input.exchangeRate === 'number' &&
      input.exchangeRate > 0
        ? input.exchangeRate
        : 1;

    const { data, error } = await (this.client as any).rpc('create_transfer', {
      p_user_id: userId,
      p_from_account_id: input.fromAccountId,
      p_to_account_id: input.toAccountId,
      p_amount_major: input.amountMajor,
      p_description: input.description || 'Transferencia',
      p_date: input.date || new Date().toISOString().split('T')[0],
      p_exchange_rate: exchangeRate,
      p_rate_source: input.rateSource || null,
    });

    if (error) {
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
    };
  }

  async delete(userId: string, transferId: string): Promise<void> {
    const { data, error } = await this.client
      .from('transactions')
      .select(
        `
        id,
        accounts!inner(user_id)
      `
      )
      .eq('accounts.user_id', userId)
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
