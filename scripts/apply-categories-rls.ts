import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyCategoriesPolicies() {
  console.log('Applying categories RLS policies...');

  try {
    const sqlPath = path.resolve(__dirname, 'fix-categories-rls.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('Executing SQL from:', sqlPath);

    const { error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      throw error;
    }

    console.log('Categories RLS policies applied successfully.');

    console.log('\nNext steps:');
    console.log('  1. Test category creation via API or UI.');
    console.log('  2. Confirm no 403 errors occur.');
  } catch (error: any) {
    console.error('Failed to apply categories policies:', error.message ?? error);
    console.error('\nManual execution steps:');
    console.error('  1. Open Supabase SQL Editor.');
    console.error('  2. Paste the contents of scripts/fix-categories-rls.sql.');
    console.error('  3. Run the query and verify policies.');
    process.exit(1);
  }
}

applyCategoriesPolicies();

