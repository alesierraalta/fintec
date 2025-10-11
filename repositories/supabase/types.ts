// Supabase database types and mappings
// These types represent the database schema for Supabase

export interface SupabaseAccount {
  id: string;
  user_id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'CARD' | 'INVESTMENT' | 'SAVINGS';
  currency_code: string;
  balance: number; // stored in minor units
  active: boolean;
  minimum_balance?: number; // stored in minor units
  alert_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT' | 'TRANSFER_IN';
  account_id: string;
  category_id?: string;
  currency_code: string;
  amount_minor: number;
  amount_base_minor: number;
  exchange_rate: number;
  date: string;
  description?: string;
  note?: string;
  tags?: string[];
  transfer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseCategory {
  id: string;
  name: string;
  kind: 'INCOME' | 'EXPENSE';
  color: string;
  icon: string;
  parent_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseBudget {
  id: string;
  name: string;
  category_id: string;
  month_year: string; // YYYY-MM format
  amount_base_minor: number;
  spent_base_minor: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseGoal {
  id: string;
  name: string;
  description?: string;
  target_base_minor: number;
  current_base_minor: number;
  target_date?: string;
  account_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseExchangeRate {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  date: string;
  provider: string;
  created_at: string;
}

export interface SupabaseTransfer {
  id: string;
  from_transaction_id: string;
  to_transaction_id: string;
  fee_minor?: number;
  created_at: string;
}

export interface SupabaseUser {
  id: string;
  email: string;
  name?: string;
  base_currency: string;
  created_at: string;
  updated_at: string;
}

// Database interface for TypeScript with Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: SupabaseUser;
        Insert: Omit<SupabaseUser, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SupabaseUser>;
      };
      accounts: {
        Row: SupabaseAccount;
        Insert: Omit<SupabaseAccount, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SupabaseAccount>;
      };
      transactions: {
        Row: SupabaseTransaction;
        Insert: Omit<SupabaseTransaction, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SupabaseTransaction>;
      };
      categories: {
        Row: SupabaseCategory;
        Insert: Omit<SupabaseCategory, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SupabaseCategory>;
      };
      budgets: {
        Row: SupabaseBudget;
        Insert: Omit<SupabaseBudget, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SupabaseBudget>;
      };
      goals: {
        Row: SupabaseGoal;
        Insert: Omit<SupabaseGoal, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SupabaseGoal>;
      };
      exchange_rates: {
        Row: SupabaseExchangeRate;
        Insert: Omit<SupabaseExchangeRate, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<SupabaseExchangeRate>;
      };
      transfers: {
        Row: SupabaseTransfer;
        Insert: Omit<SupabaseTransfer, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<SupabaseTransfer>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      account_type: 'CASH' | 'BANK' | 'CARD' | 'INVESTMENT' | 'SAVINGS';
      transaction_type: 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT' | 'TRANSFER_IN';
      category_kind: 'INCOME' | 'EXPENSE';
    };
  };
}

// Database schema definition for Supabase migration
export const SUPABASE_SCHEMA = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table
CREATE TABLE accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CASH', 'BANK', 'CARD', 'INVESTMENT', 'SAVINGS')),
  currency_code TEXT NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER_OUT', 'TRANSFER_IN')),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  currency_code TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  amount_base_minor BIGINT NOT NULL,
  exchange_rate DECIMAL(10, 6) NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  description TEXT,
  note TEXT,
  tags TEXT[],
  transfer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfers table
CREATE TABLE transfers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  to_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  fee_minor BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- YYYY-MM format
  amount_base_minor BIGINT NOT NULL,
  spent_base_minor BIGINT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, month_year)
);

-- Goals table
CREATE TABLE goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_base_minor BIGINT NOT NULL,
  current_base_minor BIGINT NOT NULL DEFAULT 0,
  target_date DATE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exchange rates table
CREATE TABLE exchange_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  rate DECIMAL(12, 6) NOT NULL,
  date DATE NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(base_currency, quote_currency, date, provider)
);

-- Indexes for better performance
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_currency ON accounts(currency_code);

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_transfer_id ON transactions(transfer_id);

CREATE INDEX idx_categories_kind ON categories(kind);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE INDEX idx_budgets_month_year ON budgets(month_year);

CREATE INDEX idx_goals_account_id ON goals(account_id);
CREATE INDEX idx_goals_target_date ON goals(target_date);

CREATE INDEX idx_exchange_rates_pair ON exchange_rates(base_currency, quote_currency);
CREATE INDEX idx_exchange_rates_date ON exchange_rates(date);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM accounts WHERE id = account_id)
);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM accounts WHERE id = account_id)
);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM accounts WHERE id = account_id)
);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM accounts WHERE id = account_id)
);

-- Categories are global (for now - could be user-specific later)
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update categories" ON categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete categories" ON categories FOR DELETE TO authenticated USING (true);

-- Budgets and goals are user-specific through category/account relationships
-- (Additional policies would be added here)

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;
