-- Legal acceptance ledger.
--
-- Records which version of the Terms of Service and Privacy Policy each user
-- accepted, and when. Without this table there is no provable consent: the
-- signup flow would assert an agreement the system cannot evidence.
--
-- Rows are append-only from the user's perspective: acceptances are never
-- updated or deleted by the account owner, because an erasable consent record
-- proves nothing.

BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- Composite version string, e.g. 'terms-1.0/privacy-1.0'.
  legal_version text NOT NULL,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  -- Where the acceptance happened: 'signup', 'oauth', 're-consent'.
  source text NOT NULL,
  -- Coarse evidence of the acceptance context. Never store full request bodies.
  user_agent text,
  CONSTRAINT legal_acceptances_source_valid
    CHECK (source IN ('signup', 'oauth', 're-consent'))
);

-- One acceptance row per user per legal version; re-submitting is idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS legal_acceptances_user_version_idx
  ON public.legal_acceptances (user_id, legal_version);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_acceptances_select_own ON public.legal_acceptances;
CREATE POLICY legal_acceptances_select_own
  ON public.legal_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS legal_acceptances_insert_own ON public.legal_acceptances;
CREATE POLICY legal_acceptances_insert_own
  ON public.legal_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policy: consent records are immutable for account
-- owners. Erasure requests are handled by the account-deletion path, which
-- runs with elevated privileges and removes the user row (cascading here).

COMMIT;
