// Simple script to create sample transactions using curl
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Sample transactions data
const transactions = [
  {
    accountId: '1',
    amount: $1,
    currencyCode: 'USD',
    type: 'INCOME',
    categoryId: '1',
    description: 'Salary Payment',
    date: new Date().toISOString()
  },
  {
    accountId: '1', 
    amount: $1,
    currencyCode: 'USD',
    type: 'INCOME', 
    categoryId: '2',
    description: 'Freelance Project',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    accountId: '1',
    amount: $1,
    currencyCode: 'USD',
    type: 'EXPENSE',
    categoryId: '5',
    description: 'Groceries and Food',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    accountId: '1',
    amount: $1,
    currencyCode: 'USD', 
    type: 'EXPENSE',
    categoryId: '8',
    description: 'Rent Payment',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    accountId: '1',
    amount: $1,
    currencyCode: 'USD',
    type: 'EXPENSE', 
    categoryId: '6',
    description: 'Gas and Transportation',
    date: new Date().toISOString()
  }
];

async function createTransactions() {
  console.log('Creating sample transactions...');
  
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
        console.log(`✓ Created: ${transaction.description} - ${transaction.type} $${(transaction.amount / 100).toFixed(2)}`);
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