-- Increase BCV rate precision from 2 to 8 decimal places
-- BCV provides rates with 8 decimals (e.g., 544.57940000)
-- Previous NUMERIC(10,2) truncated to 2 decimals, losing precision

ALTER TABLE public.bcv_rate_history
    ALTER COLUMN usd TYPE NUMERIC(12, 8),
    ALTER COLUMN eur TYPE NUMERIC(12, 8);

-- Increase exchange_rates snapshot precision for BCV-sourced values
-- These columns store USD/USDT rates that may come from BCV with full precision
ALTER TABLE public.exchange_rates
    ALTER COLUMN usd_ves TYPE NUMERIC(12, 8),
    ALTER COLUMN usdt_ves TYPE NUMERIC(12, 8),
    ALTER COLUMN sell_rate TYPE NUMERIC(12, 8),
    ALTER COLUMN buy_rate TYPE NUMERIC(12, 8);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
