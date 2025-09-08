// Script to create account and transactions with proper user authentication
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Generate a test user ID (UUID format)
const testUserId = '550e8400-e29b-41d4-a716-446655440000';

async function createAccountAndTransactions() {
  console.log('Creating test account and transactions...');
  
  try {
    // Step 1: Create a test account
    console.log('\n=== CREATING TEST ACCOUNT ===');
    const accountData = {
      name: 'Test Checking Account',
      type: 'BANK',
      currencyCode: 'USD',
      initialBalance: 500000, // $5000.00
      userId: testUserId
    };
    
    const fs = require('fs');
    fs.writeFileSync('temp_account.json', JSON.stringify(accountData));
    
    const accountCommand = 'curl -X POST http://localhost:3002/api/accounts -H "Content-Type: application/json" -d @temp_account.json';
    const { stdout: accountOutput } = await execPromise(accountCommand);
    fs.unlinkSync('temp_account.json');
    
    const accountResult = JSON.parse(accountOutput);
    
    if (!accountResult.success) {
      console.error('Failed to create account:', accountResult.error);
      if (accountResult.details) console.error('Details:', accountResult.details);
      return;
    }
    
    const createdAccountId = accountResult.data.id;
    console.log(`✓ Created account: ${accountResult.data.name} (ID: ${createdAccountId})`);
    
    // Step 2: Create transactions using the created account
    console.log('\n=== CREATING TRANSACTIONS ===');
    
    const transactions = [
      {
        accountId: createdAccountId,
        amount: 300000, // $3000.00
        currencyCode: 'USD',
        type: 'INCOME',
        categoryId: '550e8400-e29b-41d4-a716-446655440001', // Salario
        description: 'Monthly Salary Payment',
        date: new Date().toISOString()
      },
      {
        accountId: createdAccountId,
        amount: 150000, // $1500.00
        currencyCode: 'USD',
        type: 'INCOME',
        categoryId: '550e8400-e29b-41d4-a716-446655440002', // Freelance
        description: 'Freelance Web Development Project',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        accountId: createdAccountId,
        amount: 80000, // $800.00
        currencyCode: 'USD',
        type: 'EXPENSE',
        categoryId: '3e341855-5b21-47ac-b59a-9c60b9a07545', // Comida
        description: 'Groceries and Food Shopping',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        accountId: createdAccountId,
        amount: 120000, // $1200.00
        currencyCode: 'USD',
        type: 'EXPENSE',
        categoryId: '925100c1-d25e-4add-b777-56d7e8a914f9', // Alquiler
        description: 'Monthly Rent Payment',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        accountId: createdAccountId,
        amount: 25000, // $250.00
        currencyCode: 'USD',
        type: 'EXPENSE',
        categoryId: '550e8400-e29b-41d4-a716-446655440006', // Transporte
        description: 'Gas and Transportation Costs',
        date: new Date().toISOString()
      }
    ];
    
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      console.log(`\nCreating transaction ${i + 1}: ${transaction.description}`);
      
      try {
        const tempFile = `temp_transaction_${i}.json`;
        fs.writeFileSync(tempFile, JSON.stringify(transaction));
        
        const command = `curl -X POST http://localhost:3002/api/transactions -H "Content-Type: application/json" -d @${tempFile}`;
        const { stdout } = await execPromise(command);
        
        fs.unlinkSync(tempFile);
        
        const result = JSON.parse(stdout.trim());
        
        if (result.success) {
          console.log(`✓ Created: ${transaction.description}`);
          console.log(`  ${transaction.type} $${(transaction.amount / 100).toFixed(2)}`);
        } else {
          console.error(`✗ Failed: ${result.error}`);
          if (result.details) console.error('Details:', result.details);
        }
        
      } catch (error) {
        console.error(`✗ Error creating transaction ${i + 1}:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('\n✓ Finished creating account and transactions!');
    
  } catch (error) {
    console.error('Error in main process:', error.message);
  }
}

createAccountAndTransactions();