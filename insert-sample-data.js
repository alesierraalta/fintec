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
    // Step 1: Insert user
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
    
    // Step 2: Insert account
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
    
    // Step 3: Insert transactions
    console.log('\n💰 Creating test transactions...');
    
    const transactions = [
      {
        id: '550e8400-e29b-41d4-a716-446655440200',
        account_id: testAccountId,
        amount_minor: $1, // $3000.00
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
        amount_minor: $1, // $1500.00
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
        amount_minor: $1, // $800.00
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
        amount_minor: $1, // $1200.00
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
        amount_minor: $1, // $250.00
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
      console.error('❌ Error creating transactions:', transactionsError);
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
      console.error('❌ Error verifying data:', verifyError);
    } else {
      console.log(`✅ Verification complete: ${verifyTransactions.length} transactions found`);
      
      // Calculate totals
      const income = verifyTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = verifyTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      
      console.log(`💰 Total Income: $${(income / 100).toFixed(2)}`);
      console.log(`💸 Total Expenses: $${(expenses / 100).toFixed(2)}`);
      console.log(`📈 Net Balance: $${((income - expenses) / 100).toFixed(2)}`);
    }
    
    console.log('\n🎉 Sample data insertion completed successfully!');
    console.log('\n📱 You can now check your dashboard to see the data reflected.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

insertSampleData();