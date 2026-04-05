import { createServiceClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';
import { createServerOrdersRepository } from '@/repositories/factory';
import type { CreateOrderDTO, Order, OrderStatus } from '@/types/order';

const supabase = createServiceClient();

function getOrdersRepository() {
  return createServerOrdersRepository({
    serviceSupabase: supabase as any,
  });
}

function validateRequiredText(value: string, fieldName: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmed;
}

function validateSenderReference(value: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('senderReference is required');
  }

  return value;
}

function isZeroNumericString(value: string): boolean {
  return /^0+(?:\.0+)?$/.test(value);
}

export function validateExactAmount(amount: string): string {
  if (typeof amount !== 'string' || amount.length === 0) {
    throw new Error('amount is required');
  }

  if (amount !== amount.trim()) {
    throw new Error('amount must not contain leading or trailing spaces');
  }

  if (!/^\d+(?:\.\d+)?$/.test(amount)) {
    throw new Error('amount must be a numeric string');
  }

  if (isZeroNumericString(amount)) {
    throw new Error('amount must be greater than 0');
  }

  return amount;
}

export async function createOrder(
  userId: string,
  data: CreateOrderDTO
): Promise<Order> {
  try {
    const serviceName = validateRequiredText(data.serviceName, 'serviceName');
    const senderReference = validateSenderReference(data.senderReference);
    const amount = validateExactAmount(data.amount);

    return await getOrdersRepository().create(userId, {
      serviceName,
      amount,
      senderReference,
    });
  } catch (error) {
    logger.error('[OrdersService] Error in createOrder:', error);
    throw error;
  }
}

export async function listUserOrders(
  userId: string,
  status?: OrderStatus
): Promise<Order[]> {
  try {
    return await getOrdersRepository().listByUserId(userId, status);
  } catch (error) {
    logger.error('[OrdersService] Error in listUserOrders:', error);
    throw error;
  }
}

export async function getOrderById(
  orderId: string,
  userId: string
): Promise<Order | null> {
  try {
    return await getOrdersRepository().findById(orderId, userId);
  } catch (error) {
    logger.error('[OrdersService] Error in getOrderById:', error);
    throw error;
  }
}

export async function reconcileOrderAsPaid(orderId: string): Promise<Order> {
  try {
    const order = await getOrdersRepository().markPaid(orderId);

    if (!order) {
      throw new Error('order not found');
    }

    return order;
  } catch (error) {
    logger.error('[OrdersService] Error in reconcileOrderAsPaid:', error);
    throw error;
  }
}
