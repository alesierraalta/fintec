-- Create recurring_transactions table
CREATE TABLE recurring_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER_OUT')),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  currency_code TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  description TEXT,
  note TEXT,
  tags TEXT[],
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count INTEGER NOT NULL DEFAULT 1, -- Every N days/weeks/months/years
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means no end date
  next_execution_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_executed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_transactions_next_execution ON recurring_transactions(next_execution_date);
CREATE INDEX idx_recurring_transactions_active ON recurring_transactions(is_active);
CREATE INDEX idx_recurring_transactions_account_id ON recurring_transactions(account_id);
CREATE INDEX idx_recurring_transactions_category_id ON recurring_transactions(category_id);

-- Row Level Security
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recurring transactions" ON recurring_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring transactions" ON recurring_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring transactions" ON recurring_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring transactions" ON recurring_transactions FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updating timestamps
CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON recurring_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next execution date
CREATE OR REPLACE FUNCTION calculate_next_execution_date(
  current_date DATE,
  frequency TEXT,
  interval_count INTEGER
) RETURNS DATE AS $$
BEGIN
  CASE frequency
    WHEN 'daily' THEN
      RETURN current_date + (interval_count || ' days')::INTERVAL;
    WHEN 'weekly' THEN
      RETURN current_date + (interval_count || ' weeks')::INTERVAL;
    WHEN 'monthly' THEN
      RETURN current_date + (interval_count || ' months')::INTERVAL;
    WHEN 'yearly' THEN
      RETURN current_date + (interval_count || ' years')::INTERVAL;
    ELSE
      RAISE EXCEPTION 'Invalid frequency: %', frequency;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to process recurring transactions
CREATE OR REPLACE FUNCTION process_recurring_transactions()
RETURNS INTEGER AS $$
DECLARE
  rec RECORD;
  transaction_id UUID;
  processed_count INTEGER := 0;
BEGIN
  -- Find all active recurring transactions that are due for execution
  FOR rec IN 
    SELECT rt.*, a.user_id as account_user_id
    FROM recurring_transactions rt
    JOIN accounts a ON rt.account_id = a.id
    WHERE rt.is_active = true
      AND rt.next_execution_date <= CURRENT_DATE
      AND (rt.end_date IS NULL OR rt.end_date >= CURRENT_DATE)
  LOOP
    -- Create the transaction
    INSERT INTO transactions (
      type,
      account_id,
      category_id,
      currency_code,
      amount_minor,
      amount_base_minor,
      exchange_rate,
      date,
      description,
      note,
      tags
    ) VALUES (
      rec.type,
      rec.account_id,
      rec.category_id,
      rec.currency_code,
      rec.amount_minor,
      rec.amount_minor, -- Assuming same currency for now
      1.0, -- Default exchange rate
      rec.next_execution_date,
      rec.description || ' (Recurrente)',
      rec.note,
      rec.tags
    ) RETURNING id INTO transaction_id;

    -- Update the recurring transaction
    UPDATE recurring_transactions
    SET 
      next_execution_date = calculate_next_execution_date(
        next_execution_date, 
        frequency, 
        interval_count
      ),
      last_executed_at = NOW(),
      updated_at = NOW()
    WHERE id = rec.id;

    processed_count := processed_count + 1;
    
    -- Log the processing (optional)
    RAISE NOTICE 'Processed recurring transaction % for user %, created transaction %', 
      rec.id, rec.account_user_id, transaction_id;
  END LOOP;

  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule the recurring transactions processing to run daily at 6 AM
SELECT cron.schedule(
  'process-recurring-transactions',
  '0 6 * * *',
  'SELECT process_recurring_transactions();'
);

-- Function to create a recurring transaction from a regular transaction
CREATE OR REPLACE FUNCTION create_recurring_from_transaction(
  transaction_id UUID,
  frequency TEXT,
  interval_count INTEGER DEFAULT 1,
  end_date DATE DEFAULT NULL,
  recurring_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  t RECORD;
  recurring_id UUID;
  next_date DATE;
BEGIN
  -- Get the transaction details
  SELECT 
    t.*,
    a.user_id
  INTO t
  FROM transactions t
  JOIN accounts a ON t.account_id = a.id
  WHERE t.id = transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', transaction_id;
  END IF;

  -- Calculate next execution date
  next_date := calculate_next_execution_date(t.date, frequency, interval_count);

  -- Create recurring transaction
  INSERT INTO recurring_transactions (
    user_id,
    name,
    type,
    account_id,
    category_id,
    currency_code,
    amount_minor,
    description,
    note,
    tags,
    frequency,
    interval_count,
    start_date,
    end_date,
    next_execution_date
  ) VALUES (
    t.user_id,
    COALESCE(recurring_name, t.description || ' - Recurrente'),
    t.type,
    t.account_id,
    t.category_id,
    t.currency_code,
    t.amount_minor,
    t.description,
    t.note,
    t.tags,
    frequency,
    interval_count,
    t.date,
    end_date,
    next_date
  ) RETURNING id INTO recurring_id;

  RETURN recurring_id;
END;
$$ LANGUAGE plpgsql;



