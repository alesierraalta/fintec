import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/admin';
import type { OrdersRepository } from '@/repositories/contracts';
import type { CreateOrderDTO, Order, OrderStatus } from '@/types/order';

import { ORDER_LIST_PROJECTION } from './order-projections';
import { RequestContext } from '@/lib/cache/request-context';

function mapSupabaseOrder(row: any): Order {
  return {
    id: row.id,
    userId: row.user_id,
    serviceName: row.service_name,
    amount: String(row.amount),
    senderReference: row.sender_reference,
    status: row.status,
    createdAt: row.created_at,
  };
}

export class SupabaseOrdersRepository implements OrdersRepository {
  private readonly client: SupabaseClient;
  private readonly requestContext?: RequestContext;

  constructor(client?: SupabaseClient, requestContext?: RequestContext) {
    this.client =
      client || (createServiceClient() as unknown as SupabaseClient);
    this.requestContext = requestContext;
  }

  async create(userId: string, data: CreateOrderDTO): Promise<Order> {
    const { data: order, error } = await (this.client as any)
      .from('orders')
      .insert({
        user_id: userId,
        service_name: data.serviceName,
        amount: data.amount,
        sender_reference: data.senderReference,
        status: 'pending',
      })
      .select(ORDER_LIST_PROJECTION)
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return mapSupabaseOrder(order);
  }

  async findById(orderId: string, userId: string): Promise<Order | null> {
    const { data, error } = await (this.client as any)
      .from('orders')
      .select(ORDER_LIST_PROJECTION)
      .eq('id', orderId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch order: ${error.message}`);
    }

    return data ? mapSupabaseOrder(data) : null;
  }

  async listByUserId(userId: string, status?: OrderStatus): Promise<Order[]> {
    let query = (this.client as any)
      .from('orders')
      .select(ORDER_LIST_PROJECTION)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list orders: ${error.message}`);
    }

    return (data || []).map(mapSupabaseOrder);
  }

  async markPaid(orderId: string): Promise<Order | null> {
    const { data, error } = await (this.client as any)
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId)
      .select(ORDER_LIST_PROJECTION)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to reconcile order: ${error.message}`);
    }

    return data ? mapSupabaseOrder(data) : null;
  }
}
