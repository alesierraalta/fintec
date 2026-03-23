BEGIN;

CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta_base_minor BIGINT NOT NULL CHECK (delta_base_minor <> 0),
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (char_length(trim(source)) > 0),
  related_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_created_at
  ON goal_contributions(goal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_created_at
  ON goal_contributions(user_id, created_at DESC);

ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own goal contributions" ON goal_contributions;
DROP POLICY IF EXISTS "Users can insert own goal contributions" ON goal_contributions;
DROP POLICY IF EXISTS "Users can update own goal contributions" ON goal_contributions;
DROP POLICY IF EXISTS "Users can delete own goal contributions" ON goal_contributions;

CREATE POLICY "Users can view own goal contributions" ON goal_contributions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal contributions" ON goal_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal contributions" ON goal_contributions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal contributions" ON goal_contributions
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;
