// Backup service for exporting and importing user financial data
import { Account, Transaction, Category, Budget, SavingsGoal } from '@/types';
import type { AppRepository } from '@/repositories/contracts';

export interface BackupData {
  version: string;
  timestamp: string;
  userId: string;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: SavingsGoal[];
  metadata: {
    totalAccounts: number;
    totalTransactions: number;
    totalCategories: number;
    totalBudgets: number;
    totalGoals: number;
    dateRange: {
      from: string;
      to: string;
    };
  };
}

export interface BackupOptions {
  includeInactive?: boolean;
  dateFrom?: string;
  dateTo?: string;
  categories?: string[];
  accounts?: string[];
}

export class BackupService {
  private repository: AppRepository;
  private currentVersion = '1.0.0';

  constructor(repository: AppRepository) {
    this.repository = repository;
  }

  // Export all user data to backup format
  async exportUserData(userId: string, options: BackupOptions = {}): Promise<BackupData> {
    try {
      const {
        includeInactive = false,
        dateFrom,
        dateTo,
        categories: categoryFilter,
        accounts: accountFilter
      } = options;

      // Load all user data
      const [accounts, transactions, categories, budgets, goals] = await Promise.all([
        this.repository.accounts.findByUserId(userId),
        this.repository.transactions.findAll(),
        this.repository.categories.findAll(),
        this.repository.budgets.findAll(),
        this.repository.goals.findAll()
      ]);

      // Filter data based on options
      let filteredAccounts = includeInactive ? accounts : accounts.filter(acc => acc.active);
      let filteredTransactions = transactions.filter(t => {
        // Filter by user's accounts
        const isUserTransaction = filteredAccounts.some(acc => acc.id === t.accountId);
        if (!isUserTransaction) return false;

        // Filter by date range
        if (dateFrom && t.date < dateFrom) return false;
        if (dateTo && t.date > dateTo) return false;

        // Filter by accounts
        if (accountFilter && !accountFilter.includes(t.accountId)) return false;

        // Filter by categories
        if (categoryFilter && t.categoryId && !categoryFilter.includes(t.categoryId)) return false;

        return true;
      });

      let filteredCategories = includeInactive ? categories : categories.filter(cat => cat.active);
      let filteredBudgets = budgets; // Budgets are user-specific
      let filteredGoals = goals; // Goals are user-specific

      // Apply account filter if specified
      if (accountFilter) {
        filteredAccounts = filteredAccounts.filter(acc => accountFilter.includes(acc.id));
      }

      // Calculate metadata
      const transactionDates = filteredTransactions.map(t => new Date(t.date));
      const minDate = transactionDates.length > 0 ? new Date(Math.min(...transactionDates.map(d => d.getTime()))) : new Date();
      const maxDate = transactionDates.length > 0 ? new Date(Math.max(...transactionDates.map(d => d.getTime()))) : new Date();

      const backupData: BackupData = {
        version: this.currentVersion,
        timestamp: new Date().toISOString(),
        userId,
        accounts: filteredAccounts,
        transactions: filteredTransactions,
        categories: filteredCategories,
        budgets: filteredBudgets,
        goals: filteredGoals,
        metadata: {
          totalAccounts: filteredAccounts.length,
          totalTransactions: filteredTransactions.length,
          totalCategories: filteredCategories.length,
          totalBudgets: filteredBudgets.length,
          totalGoals: filteredGoals.length,
          dateRange: {
            from: minDate.toISOString(),
            to: maxDate.toISOString()
          }
        }
      };

      return backupData;
    } catch (error) {
      throw new Error(`Failed to export user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Import data from backup format
  async importUserData(userId: string, backupData: BackupData, options: {
    overwrite?: boolean;
    skipExisting?: boolean;
  } = {}): Promise<{
    imported: {
      accounts: number;
      transactions: number;
      categories: number;
      budgets: number;
      goals: number;
    };
    skipped: {
      accounts: number;
      transactions: number;
      categories: number;
      budgets: number;
      goals: number;
    };
    errors: string[];
  }> {
    const { overwrite = false, skipExisting = true } = options;
    const result = {
      imported: { accounts: 0, transactions: 0, categories: 0, budgets: 0, goals: 0 },
      skipped: { accounts: 0, transactions: 0, categories: 0, budgets: 0, goals: 0 },
      errors: [] as string[]
    };

    try {
      // Validate backup data version
      if (backupData.version !== this.currentVersion) {
        result.errors.push(`Backup version ${backupData.version} is not compatible with current version ${this.currentVersion}`);
      }

      // Import categories first (as they're referenced by transactions)
      for (const category of backupData.categories) {
        try {
          const existing = await this.repository.categories.findById(category.id);
          
          if (existing && !overwrite) {
            if (skipExisting) {
              result.skipped.categories++;
              continue;
            }
          }

          if (existing && overwrite) {
            await this.repository.categories.update(category.id, category);
          } else if (!existing) {
            await this.repository.categories.create(category);
          }
          
          result.imported.categories++;
        } catch (error) {
          result.errors.push(`Failed to import category ${category.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import accounts
      for (const account of backupData.accounts) {
        try {
          const accountWithUser = { ...account, userId };
          const existing = await this.repository.accounts.findById(account.id);
          
          if (existing && !overwrite) {
            if (skipExisting) {
              result.skipped.accounts++;
              continue;
            }
          }

          if (existing && overwrite) {
            await this.repository.accounts.update(account.id, accountWithUser);
          } else if (!existing) {
            await this.repository.accounts.create(accountWithUser);
          }
          
          result.imported.accounts++;
        } catch (error) {
          result.errors.push(`Failed to import account ${account.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import transactions
      for (const transaction of backupData.transactions) {
        try {
          const existing = await this.repository.transactions.findById(transaction.id);
          
          if (existing && !overwrite) {
            if (skipExisting) {
              result.skipped.transactions++;
              continue;
            }
          }

          if (existing && overwrite) {
            await this.repository.transactions.update(transaction.id, transaction);
          } else if (!existing) {
            await this.repository.transactions.create(transaction);
          }
          
          result.imported.transactions++;
        } catch (error) {
          result.errors.push(`Failed to import transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import budgets
      for (const budget of backupData.budgets) {
        try {
          const existing = await this.repository.budgets.findById(budget.id);
          
          if (existing && !overwrite) {
            if (skipExisting) {
              result.skipped.budgets++;
              continue;
            }
          }

          if (existing && overwrite) {
            const updateData = { ...budget, id: budget.id };
            await this.repository.budgets.update(budget.id, updateData);
          } else if (!existing) {
            const createData = {
              name: `Budget ${budget.categoryId}`, // Generate a name since Budget doesn't have one
              categoryId: budget.categoryId,
              monthYear: budget.monthYYYYMM,
              amountBaseMinor: budget.amountBaseMinor,
              active: budget.active ?? true,
            };
            await this.repository.budgets.create(createData);
          }
          
          result.imported.budgets++;
        } catch (error) {
          result.errors.push(`Failed to import budget ${budget.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import goals
      for (const goal of backupData.goals) {
        try {
          const existing = await this.repository.goals.findById(goal.id);
          
          if (existing && !overwrite) {
            if (skipExisting) {
              result.skipped.goals++;
              continue;
            }
          }

          if (existing && overwrite) {
            await this.repository.goals.update(goal.id, goal);
          } else if (!existing) {
            await this.repository.goals.create(goal);
          }
          
          result.imported.goals++;
        } catch (error) {
          result.errors.push(`Failed to import goal ${goal.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to import user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Export data as JSON file
  async exportToFile(userId: string, options: BackupOptions = {}): Promise<Blob> {
    const backupData = await this.exportUserData(userId, options);
    const jsonString = JSON.stringify(backupData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  // Import data from JSON file
  async importFromFile(userId: string, file: File, importOptions: {
    overwrite?: boolean;
    skipExisting?: boolean;
  } = {}): Promise<{
    imported: {
      accounts: number;
      transactions: number;
      categories: number;
      budgets: number;
      goals: number;
    };
    skipped: {
      accounts: number;
      transactions: number;
      categories: number;
      budgets: number;
      goals: number;
    };
    errors: string[];
  }> {
    try {
      const fileContent = await file.text();
      const backupData: BackupData = JSON.parse(fileContent);
      
      // Validate backup data structure
      if (!backupData.version || !backupData.accounts || !backupData.transactions) {
        throw new Error('Invalid backup file format');
      }

      return await this.importUserData(userId, backupData, importOptions);
    } catch (error) {
      throw new Error(`Failed to import from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate backup filename
  generateBackupFilename(userId: string, options: BackupOptions = {}): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const userPart = userId.substring(0, 8);
    
    let suffix = '';
    if (options.dateFrom || options.dateTo) {
      suffix += '_filtered';
    }
    if (options.accounts && options.accounts.length > 0) {
      suffix += '_selective';
    }
    
    return `cashew_backup_${userPart}_${timestamp}${suffix}.json`;
  }

  // Validate backup data integrity
  validateBackupData(backupData: BackupData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!backupData.version) errors.push('Missing version');
    if (!backupData.timestamp) errors.push('Missing timestamp');
    if (!backupData.userId) errors.push('Missing userId');
    if (!Array.isArray(backupData.accounts)) errors.push('Invalid accounts data');
    if (!Array.isArray(backupData.transactions)) errors.push('Invalid transactions data');
    if (!Array.isArray(backupData.categories)) errors.push('Invalid categories data');

    // Check data consistency
    const accountIds = new Set(backupData.accounts.map(acc => acc.id));
    const categoryIds = new Set(backupData.categories.map(cat => cat.id));

    for (const transaction of backupData.transactions) {
      if (!accountIds.has(transaction.accountId)) {
        errors.push(`Transaction references non-existent account: ${transaction.accountId}`);
      }
      if (transaction.categoryId && !categoryIds.has(transaction.categoryId)) {
        errors.push(`Transaction references non-existent category: ${transaction.categoryId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
