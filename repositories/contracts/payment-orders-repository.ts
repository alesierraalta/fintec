import type {
  ApprovePaymentOrderDTO,
  CreatePaymentOrderDTO,
  PaymentOrder,
  RejectPaymentOrderDTO,
  UpdatePaymentOrderDTO,
} from '@/types/payment-order';

export interface PaymentOrdersRepository {
  create(userId: string, data: CreatePaymentOrderDTO): Promise<PaymentOrder>;
  findById(orderId: string, userId?: string): Promise<PaymentOrder | null>;
  listByUserId(userId: string, status?: string): Promise<PaymentOrder[]>;
  listAll(
    status?: string,
    limit?: number,
    offset?: number
  ): Promise<PaymentOrder[]>;
  updateForUser(
    orderId: string,
    userId: string,
    data: UpdatePaymentOrderDTO
  ): Promise<PaymentOrder>;
  approve(
    orderId: string,
    adminId: string,
    data?: ApprovePaymentOrderDTO
  ): Promise<PaymentOrder>;
  setAdminNotes(orderId: string, adminNotes: string): Promise<void>;
  reject(
    orderId: string,
    adminId: string,
    data: RejectPaymentOrderDTO
  ): Promise<PaymentOrder>;
}
