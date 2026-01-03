-- Migration to fix account type constraint violation
-- This updates existing accounts with old type values to match the new database schema

-- Update CHECKING accounts to BANK
UPDATE accounts 
SET type = 'BANK', 
    updated_at = NOW()
WHERE type = 'CHECKING';

-- Update CREDIT accounts to CARD
UPDATE accounts 
SET type = 'CARD',
    updated_at = NOW()
WHERE type = 'CREDIT';

-- Verify the migration
SELECT type, COUNT(*) as count
FROM accounts
GROUP BY type
ORDER BY type;
