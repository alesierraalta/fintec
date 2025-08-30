// Supabase repository implementations (stubs)
// TODO: Complete all implementations when migrating to Supabase

export { SupabaseAccountsRepository } from './accounts-repository-impl';
export { SupabaseTransactionsRepository } from './transactions-repository-impl';
export { SupabaseCategoriesRepository } from './categories-repository-impl';
export { SupabaseBudgetsRepository } from './budgets-repository-impl';
export { SupabaseGoalsRepository } from './goals-repository-impl';
export { SupabaseExchangeRatesRepository } from './exchange-rates-repository-impl';
export { SupabaseNotificationsRepository } from './notifications-repository-impl';

export * from './types';
export * from './mappers';
export * from './client';

// Main Supabase repository implementation
import { AppRepository } from '@/repositories/contracts';
import { 
  SupabaseAccountsRepository,
  SupabaseTransactionsRepository,
  SupabaseCategoriesRepository,
  SupabaseBudgetsRepository,
  SupabaseGoalsRepository,
  SupabaseExchangeRatesRepository,
  SupabaseNotificationsRepository
} from './';

// @ts-ignore - Incomplete implementation, using LocalAppRepository instead
export class SupabaseAppRepository implements AppRepository {
  public readonly accounts: SupabaseAccountsRepository;
  public readonly transactions: SupabaseTransactionsRepository;
  public readonly categories: SupabaseCategoriesRepository;
  public readonly budgets: any; // SupabaseBudgetsRepository - incomplete implementation
  public readonly goals: any; // SupabaseGoalsRepository - incomplete implementation  
  public readonly exchangeRates: any; // SupabaseExchangeRatesRepository - incomplete implementation
  public readonly notifications: any; // SupabaseNotificationsRepository - incomplete implementation

  constructor() {
    this.accounts = new SupabaseAccountsRepository();
    this.transactions = new SupabaseTransactionsRepository();
    this.categories = new SupabaseCategoriesRepository();
    this.budgets = new SupabaseBudgetsRepository();
    this.goals = new SupabaseGoalsRepository();
    this.exchangeRates = new SupabaseExchangeRatesRepository();
    this.notifications = new SupabaseNotificationsRepository();
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { supabase } = await import('./client');
      const { data, error } = await supabase
        .from('categories')
        .select('count', { count: 'exact', head: true });
      
      return !error;
    } catch (error) {
      return false;
    }
  }

  async initialize(): Promise<void> {
    try {
      const { supabase } = await import('./client');
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Ensure user exists in users table
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || null,
          base_currency: 'USD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw new Error(`Failed to initialize user: ${error.message}`);
      }

    } catch (error) {
      throw error;
    }
  }

  async clear(): Promise<void> {
    // TODO: Implement data clearing (be very careful with this!)
    throw new Error('Supabase implementation not ready yet');
    
    /*
    // WARNING: This will delete all user data!
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Delete in reverse dependency order
    await supabase.from('budgets').delete().eq('user_id', user.id);
    await supabase.from('goals').delete().eq('user_id', user.id);
    await supabase.from('transactions').delete().eq('user_id', user.id);
    await supabase.from('accounts').delete().eq('user_id', user.id);
    
    */
  }

  // Data import/export methods implementation
  async exportAllData() {
    try {
      const [accounts, transactions, categories, budgets, goals, exchangeRates] = await Promise.all([
        this.accounts.findAll(),
        this.transactions.findAll(),
        this.categories.findAll(),
        this.budgets.findAll(),
        this.goals.findAll(),
        this.exchangeRates.findAll(),
      ]);

      return {
        accounts,
        transactions,
        categories,
        budgets,
        goals,
        exchangeRates,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async importAllData(data: any) {
    try {
      // Import in dependency order
      if (data.categories) {
        for (const category of data.categories) {
          await this.categories.create(category);
        }
      }

      if (data.accounts) {
        for (const account of data.accounts) {
          await this.accounts.create(account);
        }
      }

      if (data.transactions) {
        for (const transaction of data.transactions) {
          await this.transactions.create(transaction);
        }
      }

      if (data.budgets) {
        for (const budget of data.budgets) {
          await this.budgets.create(budget);
        }
      }

      if (data.goals) {
        for (const goal of data.goals) {
          await this.goals.create(goal);
        }
      }

      if (data.exchangeRates) {
        for (const rate of data.exchangeRates) {
          await this.exchangeRates.create(rate);
        }
      }

    } catch (error) {
      throw error;
    }
  }
}
