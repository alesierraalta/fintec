export type OrderStatus = 'pending' | 'paid';

export interface Order {
  id: string;
  userId: string;
  serviceName: string;
  amount: string;
  senderReference: string;
  status: OrderStatus;
  createdAt: string;
}

export interface CreateOrderDTO {
  serviceName: string;
  amount: string;
  senderReference: string;
}
