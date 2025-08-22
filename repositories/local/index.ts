// Local repository implementations
export { LocalAccountsRepository } from './accounts-repository-impl';
export { LocalTransactionsRepository } from './transactions-repository-impl';
export { LocalCategoriesRepository } from './categories-repository-impl';
export { LocalBudgetsRepository } from './budgets-repository-impl';
export { LocalGoalsRepository } from './goals-repository-impl';
export { LocalExchangeRatesRepository } from './exchange-rates-repository-impl';
export { LocalNotificationsRepository } from './notifications-repository-impl';
export { db, FinanceDB } from './db';

// Main repository implementation
import { AppRepository } from '@/repositories/contracts';
import { LocalAccountsRepository } from './accounts-repository-impl';
import { LocalTransactionsRepository } from './transactions-repository-impl';
import { LocalCategoriesRepository } from './categories-repository-impl';
import { LocalBudgetsRepository } from './budgets-repository-impl';
import { LocalGoalsRepository } from './goals-repository-impl';
import { LocalExchangeRatesRepository } from './exchange-rates-repository-impl';
import { LocalNotificationsRepository } from './notifications-repository-impl';
import { db } from './db';

export class LocalAppRepository implements AppRepository {
  public readonly accounts: LocalAccountsRepository;
  public readonly transactions: LocalTransactionsRepository;
  public readonly categories: LocalCategoriesRepository;
  public readonly budgets: LocalBudgetsRepository;
  public readonly goals: LocalGoalsRepository;
  public readonly exchangeRates: LocalExchangeRatesRepository;
  public readonly notifications: LocalNotificationsRepository;

  constructor() {
    this.accounts = new LocalAccountsRepository();
    this.transactions = new LocalTransactionsRepository();
    this.categories = new LocalCategoriesRepository();
    this.budgets = new LocalBudgetsRepository();
    this.goals = new LocalGoalsRepository();
    this.exchangeRates = new LocalExchangeRatesRepository();
    this.notifications = new LocalNotificationsRepository();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await db.open();
      return db.isOpen();
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async initialize(): Promise<void> {
    await db.initialize();
  }

  async clear(): Promise<void> {
    await db.clearAllData();
  }

  // Additional utility methods
  async exportAllData() {
    return db.exportData();
  }

  async importAllData(data: any) {
    return db.importData(data);
  }
}
