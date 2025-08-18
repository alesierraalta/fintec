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

-- Budgets policies
CREATE POLICY "Users can view own budgets" ON budgets FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM accounts WHERE id IN (
    SELECT account_id FROM transactions WHERE category_id = budgets.category_id
  ))
);
CREATE POLICY "Users can insert own budgets" ON budgets FOR INSERT WITH CHECK (true); -- Will be refined
CREATE POLICY "Users can update own budgets" ON budgets FOR UPDATE USING (true); -- Will be refined
CREATE POLICY "Users can delete own budgets" ON budgets FOR DELETE USING (true); -- Will be refined

-- Goals policies  
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM accounts WHERE id = goals.account_id) OR goals.account_id IS NULL
);
CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (true); -- Will be refined
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (true); -- Will be refined
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (true); -- Will be refined

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

-- Insert default categories
INSERT INTO categories (id, name, kind, color, icon, active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Salario', 'INCOME', '#22c55e', 'Banknote', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Freelance', 'INCOME', '#3b82f6', 'Laptop', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Inversiones', 'INCOME', '#8b5cf6', 'TrendingUp', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'Otros Ingresos', 'INCOME', '#06b6d4', 'Plus', true),
  ('550e8400-e29b-41d4-a716-446655440005', 'Alimentación', 'EXPENSE', '#f59e0b', 'UtensilsCrossed', true),
  ('550e8400-e29b-41d4-a716-446655440006', 'Transporte', 'EXPENSE', '#ef4444', 'Car', true),
  ('550e8400-e29b-41d4-a716-446655440007', 'Vivienda', 'EXPENSE', '#8b5cf6', 'Home', true),
  ('550e8400-e29b-41d4-a716-446655440008', 'Servicios', 'EXPENSE', '#06b6d4', 'Zap', true),
  ('550e8400-e29b-41d4-a716-446655440009', 'Entretenimiento', 'EXPENSE', '#f97316', 'Gamepad2', true),
  ('550e8400-e29b-41d4-a716-446655440010', 'Salud', 'EXPENSE', '#dc2626', 'Heart', true),
  ('550e8400-e29b-41d4-a716-446655440011', 'Educación', 'EXPENSE', '#7c3aed', 'GraduationCap', true),
  ('550e8400-e29b-41d4-a716-446655440012', 'Compras', 'EXPENSE', '#db2777', 'ShoppingBag', true),
  ('550e8400-e29b-41d4-a716-446655440013', 'Otros Gastos', 'EXPENSE', '#6b7280', 'MoreHorizontal', true);

