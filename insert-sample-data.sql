-- Script SQL para insertar datos de muestra directamente en Supabase
-- Este script debe ejecutarse desde el panel de Supabase SQL Editor

-- Insertar usuario de prueba
INSERT INTO users (id, email, name, created_at, updated_at) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@example.com',
  'Test User',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insertar cuenta de prueba
INSERT INTO accounts (id, user_id, name, type, currency_code, balance, active, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440100',
  '550e8400-e29b-41d4-a716-446655440000',
  'Test Bank Account',
  'BANK',
  'USD',
  500000, -- $5000.00
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insertar transacciones de muestra
INSERT INTO transactions (id, account_id, amount_minor, amount_base_minor, exchange_rate, currency_code, type, category_id, description, date, created_at, updated_at)
VALUES 
-- Ingresos
(
  '550e8400-e29b-41d4-a716-446655440200',
  '550e8400-e29b-41d4-a716-446655440100',
  300000, -- $3000.00
  300000,
  1.0,
  'USD',
  'INCOME',
  '550e8400-e29b-41d4-a716-446655440001', -- Salario
  'Monthly Salary Payment',
  CURRENT_DATE,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440201',
  '550e8400-e29b-41d4-a716-446655440100',
  150000, -- $1500.00
  150000,
  1.0,
  'USD',
  'INCOME',
  '550e8400-e29b-41d4-a716-446655440002', -- Freelance
  'Freelance Web Development Project',
  CURRENT_DATE - INTERVAL '3 days',
  NOW(),
  NOW()
),
-- Gastos
(
  '550e8400-e29b-41d4-a716-446655440202',
  '550e8400-e29b-41d4-a716-446655440100',
  80000, -- $800.00
  80000,
  1.0,
  'USD',
  'EXPENSE',
  '3e341855-5b21-47ac-b59a-9c60b9a07545', -- Comida
  'Groceries and Food Shopping',
  CURRENT_DATE - INTERVAL '1 day',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440203',
  '550e8400-e29b-41d4-a716-446655440100',
  120000, -- $1200.00
  120000,
  1.0,
  'USD',
  'EXPENSE',
  '925100c1-d25e-4add-b777-56d7e8a914f9', -- Alquiler
  'Monthly Rent Payment',
  CURRENT_DATE - INTERVAL '2 days',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440204',
  '550e8400-e29b-41d4-a716-446655440100',
  25000, -- $250.00
  25000,
  1.0,
  'USD',
  'EXPENSE',
  '550e8400-e29b-41d4-a716-446655440006', -- Transporte
  'Gas and Transportation Costs',
  CURRENT_DATE,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verificar los datos insertados
SELECT 
  'Transactions' as table_name,
  COUNT(*) as count,
  SUM(CASE WHEN type = 'INCOME' THEN amount_minor ELSE 0 END) / 100.0 as total_income,
  SUM(CASE WHEN type = 'EXPENSE' THEN amount_minor ELSE 0 END) / 100.0 as total_expenses
FROM transactions 
WHERE account_id = '550e8400-e29b-41d4-a716-446655440100';

-- Mostrar todas las transacciones insertadas
SELECT 
  t.id,
  t.type,
  t.amount_minor / 100.0 as amount_dollars,
  t.description,
  t.date,
  c.name as category_name
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.account_id = '550e8400-e29b-41d4-a716-446655440100'
ORDER BY t.date DESC;