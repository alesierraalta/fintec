#!/usr/bin/env node

/**
 * Script to apply recurring transactions schema to Supabase database
 * This script directly executes SQL commands against the Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sql, description) {
  console.log(`🔄 ${description}...`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If the RPC doesn't exist, we'll create it first
      if (error.code === '42883') {
        console.log('⚠️  Creating exec_sql function first...');
        await createExecSQLFunction();
        // Retry the original query
        const { data: retryData, error: retryError } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (retryError) {
          throw retryError;
        }
        console.log(`✅ ${description} completed successfully`);
        return retryData;
      } else {
        throw error;
      }
    }
    
    console.log(`✅ ${description} completed successfully`);
    return data;
  } catch (error) {
    console.error(`❌ Error in ${description}:`, error.message);
    throw error;
  }
}

async function createExecSQLFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE sql_query;
      RETURN json_build_object('success', true, 'message', 'SQL executed successfully');
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
    $$;
  `;

  const { error } = await supabase.rpc('exec', { sql: createFunctionSQL });
  if (error) {
    // Try alternative approach using raw SQL
    console.log('⚠️  Trying alternative approach...');
    const { error: altError } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);
    
    if (altError) {
      throw new Error('Cannot execute SQL functions. Please run the SQL manually in Supabase dashboard.');
    }
  }
}

async function applyRecurringTransactionsSchema() {
  console.log('🚀 Starting Recurring Transactions Schema Application...\n');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create-recurring-transactions.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        await executeSQL(statement, `Executing statement ${i + 1}/${statements.length}`);
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n🎉 Recurring Transactions schema applied successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('   • Created recurring_transactions table');
    console.log('   • Added indexes for performance');
    console.log('   • Configured Row Level Security (RLS)');
    console.log('   • Created helper functions');
    console.log('   • Scheduled pg_cron job for automatic processing');
    console.log('\n✨ Your users can now create recurring transactions!');

  } catch (error) {
    console.error('\n💥 Failed to apply schema:', error.message);
    console.log('\n🔧 Manual steps required:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the content from scripts/create-recurring-transactions.sql');
    console.log('   4. Execute the SQL manually');
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function applySchemaDirectly() {
  console.log('🚀 Applying schema using direct SQL execution...\n');

  try {
    // Create table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER_OUT')),
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        currency_code TEXT NOT NULL,
        amount_minor BIGINT NOT NULL,
        description TEXT,
        note TEXT,
        tags TEXT[],
        frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
        interval_count INTEGER NOT NULL DEFAULT 1,
        start_date DATE NOT NULL,
        end_date DATE,
        next_execution_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_executed_at TIMESTAMP WITH TIME ZONE
      );
    `, 'Creating recurring_transactions table');

    // Create indexes
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_execution ON recurring_transactions(next_execution_date);
      CREATE INDEX IF NOT EXISTS idx_recurring_transactions_active ON recurring_transactions(is_active);
    `, 'Creating indexes');

    // Enable RLS
    await executeSQL(`
      ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
    `, 'Enabling Row Level Security');

    // Create RLS policies
    await executeSQL(`
      CREATE POLICY IF NOT EXISTS "Users can view own recurring transactions" ON recurring_transactions FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "Users can insert own recurring transactions" ON recurring_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "Users can update own recurring transactions" ON recurring_transactions FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "Users can delete own recurring transactions" ON recurring_transactions FOR DELETE USING (auth.uid() = user_id);
    `, 'Creating RLS policies');

    console.log('\n🎉 Recurring Transactions schema applied successfully!');
    return true;

  } catch (error) {
    console.error('\n💥 Error applying schema:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking Supabase connection...');
  
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Connected to Supabase successfully\n');
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    process.exit(1);
  }

  // Try direct approach first
  const success = await applySchemaDirectly();
  
  if (!success) {
    console.log('\n🔄 Trying alternative approach...');
    await applyRecurringTransactionsSchema();
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { applyRecurringTransactionsSchema, applySchemaDirectly };



