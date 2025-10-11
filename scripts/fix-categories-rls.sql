-- Fix Categories RLS Policies
-- Purpose: ensure authenticated users can manage categories

-- Enable RLS on categories table (no-op if already enabled)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read categories (documented default)
CREATE POLICY IF NOT EXISTS "Anyone can view categories"
ON categories FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert categories
CREATE POLICY IF NOT EXISTS "Authenticated users can insert categories"
ON categories FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update categories
CREATE POLICY IF NOT EXISTS "Authenticated users can update categories"
ON categories FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete categories (soft delete logic enforced at app level)
CREATE POLICY IF NOT EXISTS "Authenticated users can delete categories"
ON categories FOR DELETE
TO authenticated
USING (true);

