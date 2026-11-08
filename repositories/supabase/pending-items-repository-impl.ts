import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PendingItem,
  PendingItemKind,
  CreatePendingItemDTO,
  UpdatePendingItemDTO,
} from '@/types/pending-item';
import type { PendingItemsRepository } from '@/repositories/contracts/pending-items-repository';
import { supabase } from './client';
import type { Database } from './types';
import type { RequestContext } from '@/lib/cache/request-context';
import type { CreateTransactionDTO } from '@/types/domain';

const PENDING_ITEM_PROJECTION =
  'id, user_id, kind, name, amount_base_minor, done, done_at, converted_transaction_id, created_at';

function toDomain(
  row: Database['public']['Tables']['pending_items']['Row']
): PendingItem {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    name: row.name,
    amountBaseMinor: row.amount_base_minor,
    done: row.done,
    doneAt: row.done_at,
    convertedTransactionId: row.converted_transaction_id,
    createdAt: row.created_at,
  };
}

export class SupabasePendingItemsRepository implements PendingItemsRepository {
  private client: SupabaseClient<Database>;
  private readonly requestContext?: RequestContext;

  constructor(
    client?: SupabaseClient<Database>,
    requestContext?: RequestContext
  ) {
    this.client = client || (supabase as SupabaseClient<Database>);
    this.requestContext = requestContext;
  }

  private async requireUserId(): Promise<string> {
    if (this.requestContext) return this.requestContext.userId;
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user?.id) throw new Error('Unauthorized');
    return user.id;
  }

  private async assertUserScope(userId: string): Promise<string> {
    if (!userId) throw new Error('Unauthorized');
    const authUserId = await this.requireUserId();
    if (userId !== authUserId) throw new Error('Unauthorized');
    return authUserId;
  }

  async findByUser(userId: string): Promise<PendingItem[]> {
    const scopedUserId = await this.assertUserScope(userId);
    const { data, error } = await this.client
      .from('pending_items')
      .select(PENDING_ITEM_PROJECTION)
      .eq('user_id', scopedUserId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error('Failed to fetch pending items');
    }
    return (data ?? []).map(toDomain);
  }

  async create(
    userId: string,
    data: CreatePendingItemDTO
  ): Promise<PendingItem> {
    const scopedUserId = await this.assertUserScope(userId);
    const { data: row, error } = await this.client
      .from('pending_items')
      .insert([
        {
          user_id: scopedUserId,
          kind: data.kind,
          name: data.name,
          amount_base_minor: data.amountBaseMinor ?? null,
        },
      ])
      .select(PENDING_ITEM_PROJECTION)
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create pending item');
    }
    return toDomain(row);
  }

  async update(id: string, data: UpdatePendingItemDTO): Promise<PendingItem> {
    await this.requireUserId();

    const patch: Database['public']['Tables']['pending_items']['Update'] = {};
    if (data.done !== undefined) {
      patch.done = data.done;
      patch.done_at = data.done ? new Date().toISOString() : null;
    }
    if (data.convertedTransactionId !== undefined) {
      patch.converted_transaction_id = data.convertedTransactionId;
    }

    const { data: row, error } = await this.client
      .from('pending_items')
      .update(patch)
      .eq('id', id)
      .select(PENDING_ITEM_PROJECTION)
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update pending item');
    }
    return toDomain(row);
  }

  async settle(id: string, transaction: CreateTransactionDTO): Promise<string> {
    await this.requireUserId();
    if (!Number.isInteger(transaction.amountMinor) || transaction.amountMinor <= 0) {
      throw new Error('Transaction amount must be a positive integer in minor units');
    }
    const exchangeRate = transaction.currencyCode === 'VES' ? transaction.exchangeRate || 1 : 1;
    const amountBaseMinor = transaction.currencyCode === 'VES'
      ? Math.round(transaction.amountMinor / exchangeRate)
      : transaction.amountMinor;

    const { data, error } = await (this.client as SupabaseClient).rpc(
      'settle_pending_expense',
      {
        p_pending_id: id,
        p_account_id: transaction.accountId,
        p_category_id: transaction.categoryId ?? null,
        p_type: transaction.type,
        p_currency_code: transaction.currencyCode,
        p_amount_minor: transaction.amountMinor,
        p_amount_base_minor: amountBaseMinor,
        p_exchange_rate: exchangeRate,
        p_date: transaction.date,
        p_description: transaction.description ?? null,
        p_note: transaction.note ?? null,
      }
    );
    if (error) throw new Error(error.message || 'Failed to settle pending item');
    if (!data || typeof data !== 'string') throw new Error('Failed to settle pending item: missing transaction id');
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.requireUserId();
    const { error } = await this.client
      .from('pending_items')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error('Failed to delete pending item');
    }
  }

  async deleteCompleted(userId: string, kind?: PendingItemKind): Promise<void> {
    const scopedUserId = await this.assertUserScope(userId);
    let query = this.client
      .from('pending_items')
      .delete()
      .eq('user_id', scopedUserId)
      .eq('done', true);

    if (kind) {
      query = query.eq('kind', kind);
    }

    const { error } = await query;
    if (error) {
      throw new Error('Failed to delete completed pending items');
    }
  }
}
