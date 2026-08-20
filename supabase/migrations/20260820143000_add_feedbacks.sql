-- Capture "¿esto te ha servido?" reactions
BEGIN;

CREATE TABLE IF NOT EXISTS feedbacks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id   text NOT NULL,
  sentiment   text NOT NULL CHECK (sentiment IN ('up','down','neutral')),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_user_created
  ON feedbacks (user_id, created_at DESC);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can insert own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can update own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can delete own feedbacks" ON feedbacks;

CREATE POLICY "Users can view own feedbacks"   ON feedbacks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedbacks" ON feedbacks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedbacks" ON feedbacks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own feedbacks" ON feedbacks FOR DELETE USING (auth.uid() = user_id);

COMMIT;
