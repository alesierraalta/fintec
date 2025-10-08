-- Fix Row Level Security for users table
-- Add missing INSERT policy for users table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Add the missing INSERT policy
CREATE POLICY "Users can insert own profile" ON users 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
