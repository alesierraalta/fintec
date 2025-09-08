// Script to create sample data directly via SQL to bypass RLS
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Generate test IDs
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
const testAccountId = '550e8400-e29b-41d4-a716-446655440100';

async function createSampleData() {
  console.log('Creating sample data directly in database...');
  
  try {
    // Step 1: Create user directly in database
    console.log('\n=== CREATING USER IN DATABASE ===');
    const userSql = `
      INSERT INTO users (id, email, name, created_at, updated_at) 
      VALUES ('${testUserId}', 'test@example.com', 'Test User', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
    
    console.log('User SQL:', userSql);
    
    // Step 2: Create account directly in database
    console.log('\n=== CREATING ACCOUNT IN DATABASE ===');
    const accountSql = `
      INSERT INTO accounts (id, user_id, name, type, currency_code, balance, active, created_at, updated_at)
      VALUES ('${testAccountId}', '${testUserId}', 'Test Bank Account', 'BANK', 'USD', 500000, true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
    
    console.log('Account SQL:', accountSql);
    
    // Step 3: Create transactions directly in database
    console.log('\n=== CREATING TRANSACTIONS IN DATABASE ===');
    
    const transactions = [
      {
        id: '550e8400-e29b-41d4-a716-446655440200',
        accountId: testAccountId,
        amount: 300000, // $3000.00
        currencyCode: 'USD',
        type: 'INCOME',
        categoryId: '550e8400-e29b-41d4-a716-446655440001', // Salario
        description: 'Monthly Salary Payment',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440201',
        accountId: testAccountId,
        amount: 150000, // $1500.00
        currencyCode: 'USD',
        type: 'INCOME',
        categoryId: '550e8400-e29b-41d4-a716-446655440002', // Freelance
        description: 'Freelance Web Development Project',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440202',
        accountId: testAccountId,
        amount: 80000, // $800.00
        currencyCode: 'USD',
        type: 'EXPENSE',
        categoryId: '3e341855-5b21-47ac-b59a-9c60b9a07545', // Comida
        description: 'Groceries and Food Shopping',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440203',
        accountId: testAccountId,
        amount: 120000, // $1200.00
        currencyCode: 'USD',
        type: 'EXPENSE',
        categoryId: '925100c1-d25e-4add-b777-56d7e8a914f9', // Alquiler
        description: 'Monthly Rent Payment',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440204',
        accountId: testAccountId,
        amount: 25000, // $250.00
        currencyCode: 'USD',
        type: 'EXPENSE',
        categoryId: '550e8400-e29b-41d4-a716-446655440006', // Transporte
        description: 'Gas and Transportation Costs',
        date: new Date().toISOString().split('T')[0]
      }
    ];
    
    let transactionsSql = 'INSERT INTO transactions (id, account_id, amount, currency_code, type, category_id, description, date, created_at, updated_at) VALUES ';
    
    const values = transactions.map(t => 
      `('${t.id}', '${t.accountId}', ${t.amount}, '${t.currencyCode}', '${t.type}', '${t.categoryId}', '${t.description}', '${t.date}', NOW(), NOW())`
    ).join(', ');
    
    transactionsSql += values + ' ON CONFLICT (id) DO NOTHING;';
    
    console.log('Transactions SQL:', transactionsSql);
    
    console.log('\n=== SQL STATEMENTS GENERATED ===');
    console.log('Copy and paste these SQL statements directly into your Supabase SQL editor:');
    console.log('\n-- 1. Create User');
    console.log(userSql);
    console.log('\n-- 2. Create Account');
    console.log(accountSql);
    console.log('\n-- 3. Create Transactions');
    console.log(transactionsSql);
    
    console.log('\n✓ SQL statements generated successfully!');
    console.log('\nNOTE: Execute these SQL statements directly in Supabase to bypass RLS policies.');
    
  } catch (error) {
    console.error('Error generating SQL:', error.message);
  }
}

createSampleData();