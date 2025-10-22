// Database cleanup utilities for E2E tests
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lssnujnctuchowgrspvk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzc251am5jdHVjaG93Z3JzcHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjIyOTQsImV4cCI6MjA3MDkzODI5NH0.C0_RjPLk5TvNaXp50Ir-hJpZniQs4E_wrlbmED-xMLM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

export interface TestAccount {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'CARD' | 'INVESTMENT' | 'SAVINGS';
  currencyCode: string;
  balance: number;
}

export interface TestTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT' | 'TRANSFER_IN';
  accountId: string;
  categoryId: string;
  amountMinor: number;
  description: string;
}

export class DatabaseTestUtils {
  private testUserIds: string[] = [];
  private testAccountIds: string[] = [];
  private testTransactionIds: string[] = [];
  private testBudgetIds: string[] = [];
  private testGoalIds: string[] = [];

  async cleanupAllTestData(): Promise<void> {
    try {
      // Clean up in reverse dependency order
      await this.cleanupTransactions();
      await this.cleanupBudgets();
      await this.cleanupGoals();
      await this.cleanupAccounts();
      // Don't cleanup categories as they're shared
      
    } catch (error) {
      throw error;
    }
  }

  async createTestAccount(account: Omit<TestAccount, 'id'>): Promise<TestAccount> {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        name: account.name,
        type: account.type,
        currency_code: account.currencyCode,
        balance: account.balance,
        user_id: null, // For testing without auth
        active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test account: ${error.message}`);
    }

    const testAccount: TestAccount = {
      id: data.id,
      name: data.name,
      type: data.type,
      currencyCode: data.currency_code,
      balance: data.balance
    };

    this.testAccountIds.push(testAccount.id);
    return testAccount;
  }

  async createTestTransaction(transaction: Omit<TestTransaction, 'id'>): Promise<TestTransaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        type: transaction.type,
        account_id: transaction.accountId,
        category_id: transaction.categoryId,
        currency_code: 'USD',
        amount_minor: transaction.amountMinor,
        amount_base_minor: transaction.amountMinor,
        exchange_rate: 1,
        date: new Date().toISOString().split('T')[0],
        description: transaction.description
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test transaction: ${error.message}`);
    }

    const testTransaction: TestTransaction = {
      id: data.id,
      type: data.type,
      accountId: data.account_id,
      categoryId: data.category_id,
      amountMinor: data.amount_minor,
      description: data.description
    };

    this.testTransactionIds.push(testTransaction.id);
    return testTransaction;
  }

  async getTestCategories(): Promise<any[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return data || [];
  }

  private async cleanupTransactions(): Promise<void> {
    if (this.testTransactionIds.length > 0) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', this.testTransactionIds);

      if (error) {
      } else {
      }
      this.testTransactionIds = [];
    }
  }

  private async cleanupAccounts(): Promise<void> {
    if (this.testAccountIds.length > 0) {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .in('id', this.testAccountIds);

      if (error) {
      } else {
      }
      this.testAccountIds = [];
    }
  }

  private async cleanupBudgets(): Promise<void> {
    if (this.testBudgetIds.length > 0) {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .in('id', this.testBudgetIds);

      if (error) {
      } else {
      }
      this.testBudgetIds = [];
    }
  }

  private async cleanupGoals(): Promise<void> {
    if (this.testGoalIds.length > 0) {
      const { error } = await supabase
        .from('goals')
        .delete()
        .in('id', this.testGoalIds);

      if (error) {
      } else {
      }
      this.testGoalIds = [];
    }
  }

  // Helper method to wait for elements
  async waitForDatabase(): Promise<void> {
    // Simple health check
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Database not ready: ${error.message}`);
    }
  }
}

export const dbUtils = new DatabaseTestUtils();



