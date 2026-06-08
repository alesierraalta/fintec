/**
 * Operations Bounded Context
 *
 * Groups operational repositories: orders, paymentOrders, recurringTransactions,
 * transfers, notifications, approvalRequests.
 * This context handles all transactional operations, notifications, and workflow.
 */

import type { OrdersRepository } from '@/repositories/contracts/orders-repository';
import type { PaymentOrdersRepository } from '@/repositories/contracts/payment-orders-repository';
import type { RecurringTransactionsRepository } from '@/repositories/contracts/recurring-transactions-repository';
import type { TransfersRepository } from '@/repositories/contracts/transfers-repository';
import type { NotificationsRepository } from '@/repositories/contracts/notifications-repository';
import type { ApprovalRequestsRepository } from '@/repositories/contracts/approval-requests-repository';

export interface OperationsContext {
  orders: OrdersRepository;
  paymentOrders: PaymentOrdersRepository;
  recurringTransactions: RecurringTransactionsRepository;
  transfers: TransfersRepository;
  notifications: NotificationsRepository;
  approvalRequests: ApprovalRequestsRepository;
}

export interface CreateOperationsContextInput {
  orders: OrdersRepository;
  paymentOrders: PaymentOrdersRepository;
  recurringTransactions: RecurringTransactionsRepository;
  transfers: TransfersRepository;
  notifications: NotificationsRepository;
  approvalRequests: ApprovalRequestsRepository;
}

/**
 * Factory function to create an Operations bounded context.
 *
 * @param input - Repository instances for the operations domain
 * @returns OperationsContext with grouped repository access
 */
export function createOperationsContext(input: CreateOperationsContextInput): OperationsContext {
  return {
    orders: input.orders,
    paymentOrders: input.paymentOrders,
    recurringTransactions: input.recurringTransactions,
    transfers: input.transfers,
    notifications: input.notifications,
    approvalRequests: input.approvalRequests,
  };
}
