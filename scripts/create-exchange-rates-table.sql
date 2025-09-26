-- Create exchange_rates table for storing real-time exchange rate data
CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  usd_ves DECIMAL(10, 2) NOT NULL,
  usdt_ves DECIMAL(10, 2) NOT NULL,
  sell_rate DECIMAL(10, 2) NOT NULL,
  buy_rate DECIMAL(10, 2) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
  source VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_exchange_rates_created_at ON exchange_rates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_source ON exchange_rates(source);

-- Enable Row Level Security
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read exchange rates
CREATE POLICY "Allow authenticated users to read exchange rates" ON exchange_rates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow service role to insert exchange rates
CREATE POLICY "Allow service role to insert exchange rates" ON exchange_rates
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON exchange_rates TO authenticated;
GRANT INSERT ON exchange_rates TO service_role;
