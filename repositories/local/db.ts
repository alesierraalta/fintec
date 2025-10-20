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
    
    // Use only the latest version with all indexes to avoid conflicts
    this.version(1).stores({
      users: 'id, email, baseCurrency, createdAt',
      accounts: 'id, userId, name, type, currencyCode, balance, active, createdAt, [type+active], [currencyCode+active], [userId+active]',
      transactions: 'id, type, accountId, categoryId, currencyCode, date, amountMinor, amountBaseMinor, transferId, createdAt, [accountId+date], [categoryId+date], [type+date], [date+type]',
      transfers: 'id, fromTransactionId, toTransactionId, createdAt',
      categories: 'id, name, kind, parentId, active, createdAt, [kind+active], [parentId+active]',
      budgets: 'id, categoryId, monthYear, amountBaseMinor, active, createdAt, [categoryId+monthYear], [monthYear+active]',
      goals: 'id, name, targetBaseMinor, currentBaseMinor, targetDate, accountId, active, createdAt, [active+targetDate]',
      exchangeRates: 'id, baseCurrency, quoteCurrency, date, rate, provider, createdAt, [baseCurrency+quoteCurrency+date], [baseCurrency+quoteCurrency]',
      recurringRules: 'id, name, frequency, nextRunDate, active, createdAt, [active+nextRunDate]',
    });
  }

  // Initialize database with default data
  async initialize(): Promise<void> {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await this.open();
        
        // Check if we need to create default categories
        const categoriesCount = await this.categories.count();
        if (categoriesCount === 0) {
          await this.seedDefaultCategories();
        }

        // Check if we need to create default user
        const usersCount = await this.users.count();
        if (usersCount === 0) {
          await this.seedDefaultUser();
        }

        return;
      } catch (error) {
        
        // Check for specific error types that indicate database corruption or conflicts
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : '';
        
        const isIndexError = errorMessage.includes('createIndex') || 
                           errorMessage.includes('already exists') ||
                           errorMessage.includes('ConstraintError') ||
                           errorName === 'ConstraintError';
        
        const isDatabaseClosedError = errorName === 'DatabaseClosedError';
        
        if ((isIndexError || isDatabaseClosedError) && retryCount < maxRetries - 1) {
          try {
            // Close the database if it's open
            if (this.isOpen()) {
              this.close();
            }
            
            // Reset the database
            await this.resetDatabase();
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 100));
            
            retryCount++;
            continue;
          } catch (resetError) {
          }
        }
        
        // If we've exhausted retries or it's not a recoverable error, throw
        if (retryCount >= maxRetries - 1) {
          throw error;
        }
        
        retryCount++;
      }
    }
  }

  // Reset database by deleting and recreating it
  async resetDatabase(): Promise<void> {
    try {
      // Close the database first if it's open
      if (this.isOpen()) {
        this.close();
      }
      
      // Delete the database
      await this.delete();
      
      // Wait a bit to ensure the deletion is complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      // Even if deletion fails, we can try to continue
      // The next open() call might still work
    }
  }

  // Seed default categories
  private async seedDefaultCategories(): Promise<void> {
    const defaultCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'isDefault'>[] = [
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
      userId: null,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await this.categories.bulkAdd(categoriesToInsert);
  }

  // Seed default user for local repository
  private async seedDefaultUser(): Promise<void> {
    const defaultUser: User = {
      id: 'local-user',
      email: 'usuario@local.app',
      name: 'Usuario Local',
      baseCurrency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.users.add(defaultUser);
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    await this.transaction('rw', this.tables, async () => {
      await Promise.all(this.tables.map(table => table.clear()));
    });
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
  }
}

// Singleton instance
export const db = new FinanceDB();
