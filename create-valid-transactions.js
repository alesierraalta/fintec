// Script to create sample transactions with valid IDs
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Sample transactions data with valid UUIDs from database
const transactions = [
  {
    accountId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Using first account ID
    amount: 300000, // $3000.00
    currencyCode: 'USD',
    type: 'INCOME',
    categoryId: '550e8400-e29b-41d4-a716-446655440001', // Salario
    description: 'Monthly Salary Payment',
    date: new Date().toISOString()
  },
  {
    accountId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    amount: 150000, // $1500.00
    currencyCode: 'USD',
    type: 'INCOME',
    categoryId: '550e8400-e29b-41d4-a716-446655440002', // Freelance
    description: 'Freelance Web Development Project',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    accountId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    amount: 80000, // $800.00
    currencyCode: 'USD',
    type: 'EXPENSE',
    categoryId: '3e341855-5b21-47ac-b59a-9c60b9a07545', // Comida
    description: 'Groceries and Food Shopping',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    accountId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    amount: 120000, // $1200.00
    currencyCode: 'USD',
    type: 'EXPENSE',
    categoryId: '925100c1-d25e-4add-b777-56d7e8a914f9', // Alquiler
    description: 'Monthly Rent Payment',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    accountId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    amount: 25000, // $250.00
    currencyCode: 'USD',
    type: 'EXPENSE',
    categoryId: '550e8400-e29b-41d4-a716-446655440006', // Transporte
    description: 'Gas and Transportation Costs',
    date: new Date().toISOString()
  },
  {
    accountId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    amount: 45000, // $450.00
    currencyCode: 'USD',
    type: 'EXPENSE',
    categoryId: '550e8400-e29b-41d4-a716-446655440008', // Servicios
    description: 'Utilities (Electricity, Water, Internet)',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

async function createTransactions() {
  console.log('Creating sample transactions with valid IDs...');
  
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    console.log(`\nCreating transaction ${i + 1}: ${transaction.description}`);
    
    try {
      // Write JSON to temp file and use curl
      const fs = require('fs');
      const tempFile = `temp_transaction_${i}.json`;
      fs.writeFileSync(tempFile, JSON.stringify(transaction));
      
      const command = `curl -X POST http://localhost:3002/api/transactions -H "Content-Type: application/json" -d @${tempFile}`;
      
      const { stdout, stderr } = await execPromise(command);
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      if (stderr && !stderr.includes('% Total')) {
        console.error('Error:', stderr);
        continue;
      }
      
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
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n✓ Finished creating sample transactions!');
}

createTransactions();