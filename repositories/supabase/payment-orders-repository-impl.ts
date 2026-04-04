import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaymentOrdersRepository } from '@/repositories/contracts';
import type {
  ApprovePaymentOrderDTO,
  CreatePaymentOrderDTO,
  PaymentOrder,
  RejectPaymentOrderDTO,
  UpdatePaymentOrderDTO,
} from '@/types/payment-order';
import { createServiceClient } from '@/lib/supabase/admin';

function mapSupabaseToDomain(row: any): PaymentOrder {
  return {
    id: row.id,
    userId: row.user_id,
    amountMinor: row.amount_minor,
    currencyCode: row.currency_code,
    description: row.description || undefined,
    status: row.status,
    paymentMethod: row.payment_method || undefined,
    receiptUrl: row.receipt_url || undefined,
    receiptFilename: row.receipt_filename || undefined,
    adminNotes: row.admin_notes || undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined,
    transactionId: row.transaction_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabasePaymentOrdersRepository
  implements PaymentOrdersRepository
{
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client =
      client || (createServiceClient() as unknown as SupabaseClient);
  }

  async create(
    userId: string,
    data: CreatePaymentOrderDTO
  ): Promise<PaymentOrder> {
    const { data: order, error } = await (this.client as any)
      .from('payment_orders')
      .insert({
        user_id: userId,
        amount_minor: data.amountMinor,
        currency_code: data.currencyCode || 'VES',
        description: data.description || null,
        payment_method: data.paymentMethod,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return mapSupabaseToDomain(order);
  }

  async findById(
    orderId: string,
    userId?: string
  ): Promise<PaymentOrder | null> {
    let query = (this.client as any)
      .from('payment_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      throw new Error(`Failed to get order: ${error.message}`);
    }

    return data ? mapSupabaseToDomain(data) : null;
  }

  async listByUserId(userId: string, status?: string): Promise<PaymentOrder[]> {
    let query = (this.client as any)
      .from('payment_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list user orders: ${error.message}`);
    }

    return (data || []).map(mapSupabaseToDomain);
  }

  async listAll(
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaymentOrder[]> {
    let query = (this.client as any)
      .from('payment_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list orders: ${error.message}`);
    }

    return (data || []).map(mapSupabaseToDomain);
  }

  async updateForUser(
    orderId: string,
    userId: string,
    data: UpdatePaymentOrderDTO
  ): Promise<PaymentOrder> {
    const updateData: Record<string, unknown> = {};

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.receiptUrl !== undefined) {
      updateData.receipt_url = data.receiptUrl;
      updateData.receipt_filename = data.receiptFilename || null;
      updateData.status = 'pending_review';
    }

    const { data: order, error } = await (this.client as any)
      .from('payment_orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order: ${error.message}`);
    }

    return mapSupabaseToDomain(order);
  }

  async approve(
    orderId: string,
    adminId: string,
    data: ApprovePaymentOrderDTO = {}
  ): Promise<PaymentOrder> {
    const { data: order, error } = await (this.client as any).rpc(
      'approve_payment_order',
      {
        p_order_id: orderId,
        p_admin_id: adminId,
        p_account_id: data.accountId || null,
      }
    );

    if (error) {
      throw new Error(`Failed to approve order: ${error.message}`);
    }

    return mapSupabaseToDomain(order);
  }

  async setAdminNotes(orderId: string, adminNotes: string): Promise<void> {
    const { error } = await (this.client as any)
      .from('payment_orders')
      .update({ admin_notes: adminNotes })
      .eq('id', orderId);

    if (error) {
      throw new Error(`Failed to update admin notes: ${error.message}`);
    }
  }

  async reject(
    orderId: string,
    adminId: string,
    data: RejectPaymentOrderDTO
  ): Promise<PaymentOrder> {
    const { data: order, error } = await (this.client as any)
      .from('payment_orders')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: data.adminNotes || data.reason || null,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to reject order: ${error.message}`);
    }

    return mapSupabaseToDomain(order);
  }
}
