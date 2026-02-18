-- Add user scoping for budgets and goals
-- Includes backfill, constraints, indexes, and RLS policies

BEGIN;

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id UUID;

-- Backfill budgets from categories
UPDATE budgets b
SET user_id = c.user_id
FROM categories c
WHERE b.category_id = c.id AND b.user_id IS NULL;

-- Backfill goals from accounts
UPDATE goals g
SET user_id = a.user_id
FROM accounts a
WHERE g.account_id = a.id AND g.user_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM budgets WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'budgets.user_id contains NULLs; backfill required';
  END IF;

  IF EXISTS (SELECT 1 FROM goals WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'goals.user_id contains NULLs; backfill required';
  END IF;
END $$;

ALTER TABLE budgets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE goals ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_id_fkey;
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;

ALTER TABLE budgets
  ADD CONSTRAINT budgets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE goals
  ADD CONSTRAINT goals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_id_month_year_key;
ALTER TABLE budgets
  ADD CONSTRAINT budgets_user_category_month_key
  UNIQUE (user_id, category_id, month_year);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;

CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON goals;

CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_default = false);
CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id AND is_default = false)
  WITH CHECK (auth.uid() = user_id AND is_default = false);

COMMIT;
