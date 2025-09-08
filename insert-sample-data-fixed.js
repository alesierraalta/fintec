// Script to insert sample data directly into Supabase database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Try service key first, fallback to anon key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.log('Required variables:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY (fallback)');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate test IDs
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
const testAccountId = '550e8400-e29b-41d4-a716-446655440100';

async function insertSampleData() {
  console.log('🚀 Inserting sample data into Supabase database...');
  
  try {
    // Step 1: Insert user (skip if using anon key due to RLS)
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
      console.log('⚠️  User creation skipped due to RLS:', userError.message);
    } else {
      console.log('✅ User created successfully');
    }
    
    // Step 2: Insert account (skip if using anon key due to RLS)
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
      console.log('⚠️  Account creation skipped due to RLS:', accountError.message);
    } else {
      console.log('✅ Account created successfully');
    }
    
    // Step 3: Insert transactions with correct schema
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
        category_id: '550e8400-e29b-41d4-a716-446655440001', // Salario
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
        category_id: '550e8400-e29b-41d4-a716-446655440002', // Freelance
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
        category_id: '3e341855-5b21-47ac-b59a-9c60b9a07545', // Comida
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
        category_id: '925100c1-d25e-4add-b777-56d7e8a914f9', // Alquiler
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
        category_id: '550e8400-e29b-41d4-a716-446655440006', // Transporte
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
      console.log('⚠️  Transaction creation failed due to RLS:', transactionsError.message);
      console.log('\n🔧 Trying alternative approach: Using API endpoints...');
      
      // Try using the API endpoints instead
      for (const transaction of transactions) {
        try {
          const response = await fetch('http://localhost:3000/api/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: transaction.type,
              accountId: transaction.account_id,
              categoryId: transaction.category_id,
              amount: transaction.amount_minor / 100, // Convert to dollars
              currencyCode: transaction.currency_code,
              description: transaction.description,
              date: transaction.date
            })
          });
          
          if (response.ok) {
            console.log(`✅ Transaction created via API: ${transaction.description}`);
          } else {
            console.log(`❌ API failed for: ${transaction.description}`);
          }
        } catch (apiError) {
          console.log(`❌ API error for ${transaction.description}:`, apiError.message);
        }
      }
    } else {
      console.log('✅ Transactions created successfully');
      console.log(`📊 Created ${transactions.length} transactions`);
    }
    
    // Step 4: Verify data insertion
    console.log('\n🔍 Verifying inserted data...');
    
    const { data: verifyTransactions, error: verifyError } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', testAccountId);
    
    if (verifyError) {
      console.log('⚠️  Verification failed:', verifyError.message);
      console.log('\n🌐 Checking via API instead...');
      
      try {
        const response = await fetch('http://localhost:3000/api/transactions');
        if (response.ok) {
          const apiTransactions = await response.json();
          console.log(`✅ API verification: ${apiTransactions.length} transactions found`);
        }
      } catch (apiError) {
        console.log('❌ API verification failed:', apiError.message);
      }
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
    
    console.log('\n🎉 Sample data insertion process completed!');
    console.log('\n📱 Check your dashboard to see if the data is reflected.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

insertSampleData();