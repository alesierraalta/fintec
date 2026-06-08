/**
 * Context Registry
 *
 * Exports all bounded contexts and a convenience factory to create all contexts at once.
 * This is the single entry point for accessing grouped repository interfaces.
 */

export {
  type FinanceContext,
  type CreateFinanceContextInput,
  createFinanceContext,
} from './finance';

export {
  type RatesContext,
  type CreateRatesContextInput,
  createRatesContext,
} from './rates';

export {
  type UsersContext,
  type CreateUsersContextInput,
  createUsersContext,
} from './users';

export {
  type OperationsContext,
  type CreateOperationsContextInput,
  createOperationsContext,
} from './operations';

import { createFinanceContext, type CreateFinanceContextInput } from './finance';
import { createRatesContext, type CreateRatesContextInput } from './rates';
import { createUsersContext, type CreateUsersContextInput } from './users';
import { createOperationsContext, type CreateOperationsContextInput } from './operations';

export interface AllContexts {
  finance: import('./finance').FinanceContext;
  rates: import('./rates').RatesContext;
  users: import('./users').UsersContext;
  operations: import('./operations').OperationsContext;
}

export interface CreateAllContextsInput {
  // Finance
  transactions: CreateFinanceContextInput['transactions'];
  accounts: CreateFinanceContextInput['accounts'];
  budgets: CreateFinanceContextInput['budgets'];
  goals: CreateFinanceContextInput['goals'];
  // Rates
  exchangeRates: CreateRatesContextInput['exchangeRates'];
  ratesHistory: CreateRatesContextInput['ratesHistory'];
  scrapeAttempts: CreateRatesContextInput['scrapeAttempts'];
  // Users
  usersProfile: CreateUsersContextInput['usersProfile'];
  subscriptions: CreateUsersContextInput['subscriptions'];
  waitlist: CreateUsersContextInput['waitlist'];
  // Operations
  orders: CreateOperationsContextInput['orders'];
  paymentOrders: CreateOperationsContextInput['paymentOrders'];
  recurringTransactions: CreateOperationsContextInput['recurringTransactions'];
  transfers: CreateOperationsContextInput['transfers'];
  notifications: CreateOperationsContextInput['notifications'];
  approvalRequests: CreateOperationsContextInput['approvalRequests'];
}

/**
 * Factory function to create all bounded contexts at once.
 *
 * @param input - All repository instances needed across all contexts
 * @returns AllContexts with grouped repository access by domain
 */
export function createAllContexts(input: CreateAllContextsInput): AllContexts {
  return {
    finance: createFinanceContext({
      transactions: input.transactions,
      accounts: input.accounts,
      budgets: input.budgets,
      goals: input.goals,
    }),
    rates: createRatesContext({
      exchangeRates: input.exchangeRates,
      ratesHistory: input.ratesHistory,
      scrapeAttempts: input.scrapeAttempts,
    }),
    users: createUsersContext({
      usersProfile: input.usersProfile,
      subscriptions: input.subscriptions,
      waitlist: input.waitlist,
    }),
    operations: createOperationsContext({
      orders: input.orders,
      paymentOrders: input.paymentOrders,
      recurringTransactions: input.recurringTransactions,
      transfers: input.transfers,
      notifications: input.notifications,
      approvalRequests: input.approvalRequests,
    }),
  };
}
