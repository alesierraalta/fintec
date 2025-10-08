const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lssnujnctuchowgrspvk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzc251am5jdHVjaG93Z3JzcHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjIyOTQsImV4cCI6MjA3MDkzODI5NH0.C0_RjPLk5TvNaXp50Ir-hJpZniQs4E_wrlbmED-xMLM';

// Create a Supabase client with service role to bypass RLS
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabaseAmounts() {
  console.log('🔍 Checking database for amount issues...\n');

  try {
    // Get ALL transactions without authentication to see the raw data
    console.log('1️⃣ Fetching all transactions from database...');
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log('❌ Error fetching transactions:', error.message);
      return;
    }

    console.log(`✅ Found ${transactions?.length || 0} transactions\n`);

    if (!transactions || transactions.length === 0) {
      console.log('⚠️  No transactions found in database');
      return;
    }

    // Analyze each transaction
    console.log('📊 Analyzing transaction amounts:\n');
    
    let issues = 0;
    transactions.forEach((tx, index) => {
      console.log(`${index + 1}. Transaction ID: ${tx.id}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Date: ${tx.date}`);
      console.log(`   Type: ${tx.type}`);
      
      // Check all amount-related fields
      const fields = ['amount', 'amount_minor', 'amountMinor'];
      fields.forEach(field => {
        if (tx[field] !== undefined) {
          console.log(`   ${field}: ${tx[field]} (type: ${typeof tx[field]})`);
          
          // Check if value is problematic
          if (tx[field] === null) {
            console.log(`   ⚠️  ${field} is NULL`);
            issues++;
          } else if (isNaN(tx[field])) {
            console.log(`   ❌ ${field} is NaN!`);
            issues++;
          } else if (!isFinite(tx[field])) {
            console.log(`   ❌ ${field} is Infinity!`);
            issues++;
          }
        }
      });
      
      console.log('');
    });

    console.log(`\n📈 Summary:`);
    console.log(`   Total transactions: ${transactions.length}`);
    console.log(`   Issues found: ${issues}`);

    // Check schema
    console.log('\n2️⃣ Checking table schema...');
    const { data: schemaData, error: schemaError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);

    if (!schemaError && schemaData && schemaData.length > 0) {
      console.log('   Available fields:', Object.keys(schemaData[0]));
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkDatabaseAmounts();
