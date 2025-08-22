import Dexie, { Table } from 'dexie';
import {
  Account,
  Transaction,
  Category,
  Budget,
  SavingsGoal,
  ExchangeRate,
  Transfer,
  User,
  RecurringRule,
  CategoryKind,
} from '@/types';

// Dexie database schema
export class FinanceDB extends Dexie {
  // Tables
  users!: Table<User>;
  accounts!: Table<Account>;
  transactions!: Table<Transaction>;
  transfers!: Table<Transfer>;
  categories!: Table<Category>;
  budgets!: Table<Budget>;
  goals!: Table<SavingsGoal>;
  exchangeRates!: Table<ExchangeRate>;
  recurringRules!: Table<RecurringRule>;

  constructor() {
    super('FinanceDB');
    
    this.version(1).stores({
      users: 'id, email, baseCurrency, createdAt',
      accounts: 'id, userId, name, type, currencyCode, balance, active, createdAt',
      transactions: 'id, type, accountId, categoryId, currencyCode, date, amountMinor, amountBaseMinor, transferId, createdAt',
      transfers: 'id, fromTransactionId, toTransactionId, createdAt',
      categories: 'id, name, kind, parentId, active, createdAt',
      budgets: 'id, categoryId, monthYear, amountBaseMinor, active, createdAt',
      goals: 'id, name, targetBaseMinor, currentBaseMinor, targetDate, accountId, active, createdAt',
      exchangeRates: 'id, baseCurrency, quoteCurrency, date, rate, provider, createdAt',
      recurringRules: 'id, name, frequency, nextRunDate, active, createdAt',
    });

    // Add indexes for better query performance
    this.version(2).stores({
      users: 'id, email, baseCurrency, createdAt',
      accounts: 'id, userId, name, type, currencyCode, balance, active, createdAt, [type+active], [currencyCode+active]',
      transactions: 'id, type, accountId, categoryId, currencyCode, date, amountMinor, amountBaseMinor, transferId, createdAt, [accountId+date], [categoryId+date], [type+date], [date+type]',
      transfers: 'id, fromTransactionId, toTransactionId, createdAt',
      categories: 'id, name, kind, parentId, active, createdAt, [kind+active], [parentId+active]',
      budgets: 'id, categoryId, monthYear, amountBaseMinor, active, createdAt, [categoryId+monthYear], [monthYear+active]',
      goals: 'id, name, targetBaseMinor, currentBaseMinor, targetDate, accountId, active, createdAt, [active+targetDate]',
      exchangeRates: 'id, baseCurrency, quoteCurrency, date, rate, provider, createdAt, [baseCurrency+quoteCurrency+date], [baseCurrency+quoteCurrency], date',
      recurringRules: 'id, name, frequency, nextRunDate, active, createdAt, [active+nextRunDate]',
    });

    // Migration hooks
    this.version(2).upgrade(async (tx) => {
      // Add any data migrations if needed
      console.log('Upgrading FinanceDB to version 2');
    });
  }

  // Initialize database with default data
  async initialize(): Promise<void> {
    try {
      await this.open();
      
      // Check if we need to seed default data
      const categoriesCount = await this.categories.count();
      if (categoriesCount === 0) {
        await this.seedDefaultCategories();
      }

      console.log('FinanceDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FinanceDB:', error);
      throw error;
    }
  }

  // Seed default categories
  private async seedDefaultCategories(): Promise<void> {
    const defaultCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // Income categories
      { name: 'Salario', kind: CategoryKind.INCOME, color: '#22c55e', icon: 'Banknote', parentId: undefined, active: true },
      { name: 'Freelance', kind: CategoryKind.INCOME, color: '#3b82f6', icon: 'Laptop', parentId: undefined, active: true },
      { name: 'Inversiones', kind: CategoryKind.INCOME, color: '#8b5cf6', icon: 'TrendingUp', parentId: undefined, active: true },
      { name: 'Otros Ingresos', kind: CategoryKind.INCOME, color: '#06b6d4', icon: 'Plus', parentId: undefined, active: true },

      // Expense categories
      { name: 'Alimentación', kind: CategoryKind.EXPENSE, color: '#f59e0b', icon: 'UtensilsCrossed', parentId: undefined, active: true },
      { name: 'Transporte', kind: CategoryKind.EXPENSE, color: '#ef4444', icon: 'Car', parentId: undefined, active: true },
      { name: 'Vivienda', kind: CategoryKind.EXPENSE, color: '#8b5cf6', icon: 'Home', parentId: undefined, active: true },
      { name: 'Servicios', kind: CategoryKind.EXPENSE, color: '#06b6d4', icon: 'Zap', parentId: undefined, active: true },
      { name: 'Entretenimiento', kind: CategoryKind.EXPENSE, color: '#f97316', icon: 'Gamepad2', parentId: undefined, active: true },
      { name: 'Salud', kind: CategoryKind.EXPENSE, color: '#dc2626', icon: 'Heart', parentId: undefined, active: true },
      { name: 'Educación', kind: CategoryKind.EXPENSE, color: '#7c3aed', icon: 'GraduationCap', parentId: undefined, active: true },
      { name: 'Compras', kind: CategoryKind.EXPENSE, color: '#db2777', icon: 'ShoppingBag', parentId: undefined, active: true },
      { name: 'Otros Gastos', kind: CategoryKind.EXPENSE, color: '#6b7280', icon: 'MoreHorizontal', parentId: undefined, active: true },
    ];

    const categoriesToInsert: Category[] = defaultCategories.map((cat, index) => ({
      ...cat,
      id: `cat_${index + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await this.categories.bulkAdd(categoriesToInsert);
    console.log('Default categories seeded');
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    await this.transaction('rw', this.tables, async () => {
      await Promise.all(this.tables.map(table => table.clear()));
    });
    console.log('All data cleared from FinanceDB');
  }

  // Export data for backup
  async exportData(): Promise<{
    users: User[];
    accounts: Account[];
    transactions: Transaction[];
    transfers: Transfer[];
    categories: Category[];
    budgets: Budget[];
    goals: SavingsGoal[];
    exchangeRates: ExchangeRate[];
    recurringRules: RecurringRule[];
  }> {
    return {
      users: await this.users.toArray(),
      accounts: await this.accounts.toArray(),
      transactions: await this.transactions.toArray(),
      transfers: await this.transfers.toArray(),
      categories: await this.categories.toArray(),
      budgets: await this.budgets.toArray(),
      goals: await this.goals.toArray(),
      exchangeRates: await this.exchangeRates.toArray(),
      recurringRules: await this.recurringRules.toArray(),
    };
  }

  // Import data from backup
  async importData(data: {
    users?: User[];
    accounts?: Account[];
    transactions?: Transaction[];
    transfers?: Transfer[];
    categories?: Category[];
    budgets?: Budget[];
    goals?: SavingsGoal[];
    exchangeRates?: ExchangeRate[];
    recurringRules?: RecurringRule[];
  }): Promise<void> {
    await this.transaction('rw', this.tables, async () => {
      if (data.users) await this.users.bulkPut(data.users);
      if (data.accounts) await this.accounts.bulkPut(data.accounts);
      if (data.categories) await this.categories.bulkPut(data.categories);
      if (data.transactions) await this.transactions.bulkPut(data.transactions);
      if (data.transfers) await this.transfers.bulkPut(data.transfers);
      if (data.budgets) await this.budgets.bulkPut(data.budgets);
      if (data.goals) await this.goals.bulkPut(data.goals);
      if (data.exchangeRates) await this.exchangeRates.bulkPut(data.exchangeRates);
      if (data.recurringRules) await this.recurringRules.bulkPut(data.recurringRules);
    });
    console.log('Data imported successfully');
  }
}

// Singleton instance
export const db = new FinanceDB();
