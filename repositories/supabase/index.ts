// Supabase repository implementations (stubs)
// TODO: Complete all implementations when migrating to Supabase

export { SupabaseAccountsRepository } from './accounts-repository-impl';
export { SupabaseTransactionsRepository } from './transactions-repository-impl';
export { SupabaseCategoriesRepository } from './categories-repository-impl';
export { SupabaseBudgetsRepository } from './budgets-repository-impl';
export { SupabaseGoalsRepository } from './goals-repository-impl';
export { SupabaseExchangeRatesRepository } from './exchange-rates-repository-impl';
export { SupabaseNotificationsRepository } from './notifications-repository-impl';
export { SupabaseRecurringTransactionsRepository } from './recurring-transactions-repository-impl';
export { SupabaseTransfersRepository } from './transfers-repository-impl';
export { SupabaseWaitlistRepository } from './waitlist-repository-impl';
export { SupabaseApprovalRequestsRepository } from './approval-requests-repository-impl';
export { SupabaseAIInfraRepository } from './ai-infra-repository-impl';
export { SupabaseSubscriptionsRepository } from './subscriptions-repository-impl';
export { SupabasePaymentOrdersRepository } from './payment-orders-repository-impl';
export { SupabaseOrdersRepository } from './orders-repository-impl';
export { SupabaseRatesHistoryRepository } from './rates-history-repository-impl';
export { SupabaseUsersProfileRepository } from './users-profile-repository-impl';

export * from './types';
export * from './mappers';
export * from './client';

// Main Supabase repository implementation
import { AppRepository } from '@/repositories/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as browserClient } from './client';
import { SupabaseAccountsRepository } from './accounts-repository-impl';
import { SupabaseTransactionsRepository } from './transactions-repository-impl';
import { SupabaseCategoriesRepository } from './categories-repository-impl';
import { SupabaseBudgetsRepository } from './budgets-repository-impl';
import { SupabaseGoalsRepository } from './goals-repository-impl';
import { SupabaseExchangeRatesRepository } from './exchange-rates-repository-impl';
import { SupabaseNotificationsRepository } from './notifications-repository-impl';
import { SupabaseRecurringTransactionsRepository } from './recurring-transactions-repository-impl';

export class SupabaseAppRepository implements AppRepository {
  public readonly accounts: SupabaseAccountsRepository;
  public readonly transactions: SupabaseTransactionsRepository;
  public readonly categories: SupabaseCategoriesRepository;
  public readonly budgets: SupabaseBudgetsRepository;
  public readonly goals: SupabaseGoalsRepository;
  public readonly exchangeRates: SupabaseExchangeRatesRepository;
  public readonly notifications: SupabaseNotificationsRepository;
  public readonly recurringTransactions: SupabaseRecurringTransactionsRepository;
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || browserClient;
    this.accounts = new SupabaseAccountsRepository(this.client);
    this.transactions = new SupabaseTransactionsRepository(this.client);
    this.categories = new SupabaseCategoriesRepository(this.client);
    this.budgets = new SupabaseBudgetsRepository(this.client);
    this.goals = new SupabaseGoalsRepository(this.client);
    this.exchangeRates = new SupabaseExchangeRatesRepository(this.client);
    this.notifications = new SupabaseNotificationsRepository(this.client);
    this.recurringTransactions = new SupabaseRecurringTransactionsRepository(
      this.client
    );

    // Set up dependencies
    this.transactions.setAccountsRepository(this.accounts);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('categories')
        .select('count', { count: 'exact', head: true });

      return !error;
    } catch (error) {
      return false;
    }
  }

  async initialize(): Promise<void> {
    try {
      // Check if user is authenticated
      const {
        data: { user },
      } = await this.client.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Ensure user exists in users table
      const { error } = await (this.client.from('users') as any).upsert({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || null,
        base_currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

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
      const [
        accounts,
        transactions,
        categories,
        budgets,
        goals,
        exchangeRates,
      ] = await Promise.all([
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
