// Repository contracts
export * from './base-repository';
export * from './accounts-repository';
export * from './transactions-repository';
export * from './categories-repository';
export * from './budgets-repository';
export * from './goals-repository';
export * from './exchange-rates-repository';
export * from './notifications-repository';
export * from './recurring-transactions-repository';
export * from './transfers-repository';
export * from './waitlist-repository';
export * from './approval-requests-repository';
export * from './ai-infra-repository';
export * from './subscriptions-repository';
export * from './payment-orders-repository';
export * from './orders-repository';
export * from './rates-history-repository';
export * from './users-profile-repository';

// Main repository interface that combines all repositories
import { AccountsRepository } from './accounts-repository';
import { TransactionsRepository } from './transactions-repository';
import { CategoriesRepository } from './categories-repository';
import { BudgetsRepository } from './budgets-repository';
import { GoalsRepository } from './goals-repository';
import { ExchangeRatesRepository } from './exchange-rates-repository';
import { RecurringTransactionsRepository } from './recurring-transactions-repository';
import { TransfersRepository } from './transfers-repository';
import { PaymentOrdersRepository } from './payment-orders-repository';
import { RatesHistoryRepository } from './rates-history-repository';
import { NotificationsRepository } from './notifications-repository';
import { UsersProfileRepository } from './users-profile-repository';
import { WaitlistRepository } from './waitlist-repository';
import { SubscriptionsRepository } from './subscriptions-repository';
import { ApprovalRequestsRepository } from './approval-requests-repository';
import { AIInfraRepository } from './ai-infra-repository';
import { OrdersRepository } from './orders-repository';
import { Repository } from './base-repository';

export interface AppRepository extends Repository {
  accounts: AccountsRepository;
  transactions: TransactionsRepository;
  categories: CategoriesRepository;
  budgets: BudgetsRepository;
  goals: GoalsRepository;
  exchangeRates: ExchangeRatesRepository;
  notifications: NotificationsRepository;
  recurringTransactions: RecurringTransactionsRepository;
  transfers: TransfersRepository;
  paymentOrders: PaymentOrdersRepository;
  ratesHistory: RatesHistoryRepository;
  usersProfile: UsersProfileRepository;
  waitlist: WaitlistRepository;
  subscriptions: SubscriptionsRepository;
  approvalRequests: ApprovalRequestsRepository;
  aiInfra: AIInfraRepository;
  orders: OrdersRepository;
}
