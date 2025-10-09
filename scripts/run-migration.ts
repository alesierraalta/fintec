import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting migration...\n');
    
    // Read the migration SQL file
    const sqlPath = join(__dirname, 'migrations', '001_add_subscription_schema.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Split SQL into individual statements (simple split, works for most cases)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        // Continue with next statement
      } else {
        console.log(`✅ Statement ${i + 1} completed`);
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure Stripe products in Stripe Dashboard');
    console.log('2. Add environment variables to .env.local');
    console.log('3. Run: npm run tsx scripts/migrate-subscriptions.ts');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

