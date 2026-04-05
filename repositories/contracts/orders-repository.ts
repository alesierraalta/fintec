import type { CreateOrderDTO, Order, OrderStatus } from '@/types/order';

export interface OrdersRepository {
  create(userId: string, data: CreateOrderDTO): Promise<Order>;
  findById(orderId: string, userId: string): Promise<Order | null>;
  listByUserId(userId: string, status?: OrderStatus): Promise<Order[]>;
  markPaid(orderId: string): Promise<Order | null>;
}
