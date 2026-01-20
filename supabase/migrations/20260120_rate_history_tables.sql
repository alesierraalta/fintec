-- Create bcv_rate_history table
CREATE TABLE IF NOT EXISTS public.bcv_rate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    usd NUMERIC(10, 2) NOT NULL,
    eur NUMERIC(10, 2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create binance_rate_history table
CREATE TABLE IF NOT EXISTS public.binance_rate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    usd NUMERIC(10, 2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'Binance',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bcv_rate_history_date ON public.bcv_rate_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_binance_rate_history_date ON public.binance_rate_history(date DESC);

-- Enable RLS
ALTER TABLE public.bcv_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binance_rate_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow anonymous read/write for public exchange rate data
CREATE POLICY "Allow anonymous select on bcv_rate_history"
    ON public.bcv_rate_history FOR SELECT
    USING (true);

CREATE POLICY "Allow anonymous upsert on bcv_rate_history"
    ON public.bcv_rate_history FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update on bcv_rate_history"
    ON public.bcv_rate_history FOR UPDATE
    USING (true);

CREATE POLICY "Allow anonymous select on binance_rate_history"
    ON public.binance_rate_history FOR SELECT
    USING (true);

CREATE POLICY "Allow anonymous upsert on binance_rate_history"
    ON public.binance_rate_history FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update on binance_rate_history"
    ON public.binance_rate_history FOR UPDATE
    USING (true);

