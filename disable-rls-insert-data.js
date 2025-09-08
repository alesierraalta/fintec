// Script to temporarily disable RLS and insert sample data
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test data
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
const testAccountId = '550e8400-e29b-41d4-a716-446655440100';

async function insertDataWithoutRLS() {
  console.log('🚀 Inserting sample data by temporarily disabling RLS...');
  
  try {
    // Step 1: Disable RLS temporarily
    console.log('\n🔓 Temporarily disabling RLS policies...');
    
    const disableRLSQueries = [
      'ALTER TABLE users DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;'
    ];
    
    for (const query of disableRLSQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`⚠️  Could not execute: ${query}`);
        console.log('Error:', error.message);
      }
    }
    
    // Step 2: Insert user
    console.log('\n📝 Creating test user...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (userError) {
      console.error('❌ Error creating user:', userError);
    } else {
      console.log('✅ User created successfully');
    }
    
    // Step 3: Insert account
    console.log('\n💳 Creating test account...');
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .upsert({
        id: testAccountId,
        user_id: testUserId,
        name: 'Test Bank Account',
        type: 'BANK',
        currency_code: 'USD',
        balance: 500000, // $5000.00
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (accountError) {
      console.error('❌ Error creating account:', accountError);
    } else {
      console.log('✅ Account created successfully');
    }
    
    // Step 4: Insert transactions
    console.log('\n💰 Creating test transactions...');
    
    const transactions = [
      {
        id: '550e8400-e29b-41d4-a716-446655440200',
        account_id: testAccountId,
        amount_minor: 300000, // $3000.00
        amount_base_minor: 300000,
        exchange_rate: 1.0,
        currency_code: 'USD',
        type: 'INCOME',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Monthly Salary Payment',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440201',
        account_id: testAccountId,
        amount_minor: 150000, // $1500.00
        amount_base_minor: 150000,
        exchange_rate: 1.0,
        currency_code: 'USD',
        type: 'INCOME',
        category_id: '550e8400-e29b-41d4-a716-446655440002',
        description: 'Freelance Web Development Project',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440202',
        account_id: testAccountId,
        amount_minor: 80000, // $800.00
        amount_base_minor: 80000,
        exchange_rate: 1.0,
        currency_code: 'USD',
        type: 'EXPENSE',
        category_id: '3e341855-5b21-47ac-b59a-9c60b9a07545',
        description: 'Groceries and Food Shopping',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440203',
        account_id: testAccountId,
        amount_minor: 120000, // $1200.00
        amount_base_minor: 120000,
        exchange_rate: 1.0,
        currency_code: 'USD',
        type: 'EXPENSE',
        category_id: '925100c1-d25e-4add-b777-56d7e8a914f9',
        description: 'Monthly Rent Payment',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440204',
        account_id: testAccountId,
        amount_minor: 25000, // $250.00
        amount_base_minor: 25000,
        exchange_rate: 1.0,
        currency_code: 'USD',
        type: 'EXPENSE',
        category_id: '550e8400-e29b-41d4-a716-446655440006',
        description: 'Gas and Transportation Costs',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .upsert(transactions, { onConflict: 'id' });
    
    if (transactionsError) {
      console.error('❌ Error creating transactions:', transactionsError);
    } else {
      console.log('✅ Transactions created successfully');
      console.log(`📊 Created ${transactions.length} transactions`);
    }
    
    // Step 5: Re-enable RLS
    console.log('\n🔒 Re-enabling RLS policies...');
    
    const enableRLSQueries = [
      'ALTER TABLE users ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;'
    ];
    
    for (const query of enableRLSQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`⚠️  Could not execute: ${query}`);
        console.log('Error:', error.message);
      }
    }
    
    // Step 6: Verify data insertion
    console.log('\n🔍 Verifying inserted data...');
    
    const { data: verifyTransactions, error: verifyError } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', testAccountId);
    
    if (verifyError) {
      console.log('⚠️  Verification failed:', verifyError.message);
    } else {
      console.log(`✅ Verification complete: ${verifyTransactions.length} transactions found`);
      
      // Calculate totals
      const income = verifyTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount_minor, 0);
      
      const expenses = verifyTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount_minor, 0);
      
      console.log(`💰 Total Income: $${(income / 100).toFixed(2)}`);
      console.log(`💸 Total Expenses: $${(expenses / 100).toFixed(2)}`);
      console.log(`📈 Net Balance: $${((income - expenses) / 100).toFixed(2)}`);
    }
    
    console.log('\n🎉 Sample data insertion completed!');
    console.log('\n📱 Check your dashboard to see if the data is reflected.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    
    // Make sure to re-enable RLS even if there's an error
    console.log('\n🔒 Re-enabling RLS policies after error...');
    const enableRLSQueries = [
      'ALTER TABLE users ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;'
    ];
    
    for (const query of enableRLSQueries) {
      try {
        await supabase.rpc('exec_sql', { sql: query });
      } catch (e) {
        console.log(`⚠️  Could not re-enable RLS: ${e.message}`);
      }
    }
    
    process.exit(1);
  }
}

insertDataWithoutRLS();