-- Add payment_method to payment_orders table
-- Supports Ubii, PagoFlash, and Binance Pay
ALTER TABLE payment_orders 
ADD COLUMN payment_method TEXT 
CHECK (payment_method IS NULL OR payment_method IN ('ubii', 'pagoflash', 'binance_pay'));

-- Update existing orders to have no specific method (will default to legacy manual)
COMMENT ON COLUMN payment_orders.payment_method IS 'Provider used for payment: ubii, pagoflash, or binance_pay. NULL indicates legacy manual transfer.';
