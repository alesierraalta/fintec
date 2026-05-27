CREATE TABLE public.scrape_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    trigger TEXT NOT NULL,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    failure_reason TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    extracted_currencies TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scrape_attempts_created_at ON public.scrape_attempts(created_at DESC);

ALTER TABLE public.scrape_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select" ON public.scrape_attempts FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.scrape_attempts FOR INSERT WITH CHECK (true);
