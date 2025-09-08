// Script to create sample transactions data
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Sample data for testing
const sampleTransactions = [
  {
    accountId: '1', // Assuming account ID 1 exists
    amount: 250000, // $2500.00 in minor units (cents)
    currencyCode: 'USD',
    type: 'INCOME',
    categoryId: '1', // Assuming category ID 1 exists
    description: 'Salary Payment',
    date: new Date().toISOString()
  },
  {
    accountId: '1',
    amount: 150000, // $1500.00
    currencyCode: 'USD', 
    type: 'INCOME',
    categoryId: '1',
    description: 'Freelance Work',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  },
  {
    accountId: '1',
    amount: 80000, // $800.00
    currencyCode: 'USD',
    type: 'EXPENSE', 
    categoryId: '2', // Different category for expenses
    description: 'Rent Payment',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  {
    accountId: '1',
    amount: 25000, // $250.00
    currencyCode: 'USD',
    type: 'EXPENSE',
    categoryId: '2',
    description: 'Groceries',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    accountId: '1',
    amount: 12000, // $120.00
    currencyCode: 'USD',
    type: 'EXPENSE',
    categoryId: '2',
    description: 'Utilities',
    date: new Date().toISOString()
  }
];

async function createSampleData() {
  console.log('Creating sample transaction data...');
  
  try {
    for (let i = 0; i < sampleTransactions.length; i++) {
      const transaction = sampleTransactions[i];
      console.log(`Creating transaction ${i + 1}:`, transaction.description);
      
      const jsonData = JSON.stringify(transaction).replace(/"/g, '\"');
      const powershellCommand = `powershell -Command "try { $body = '${jsonData}'; $response = Invoke-RestMethod -Uri 'http://localhost:3002/api/transactions' -Method POST -Body $body -ContentType 'application/json'; $response | ConvertTo-Json -Compress } catch { Write-Output '{\"success\": false, \"error\": \"' + $_.Exception.Message + '\"}' }"`;
      
      const { stdout } = await execPromise(powershellCommand);
      const result = JSON.parse(stdout.trim());
      
      if (result.success) {
        console.log(`✓ Created: ${transaction.description} - ${transaction.type} $${transaction.amount / 100}`);
      } else {
        console.error(`✗ Failed to create ${transaction.description}:`, result.error);
        if (result.details) {
          console.error('Details:', result.details);
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n✓ Sample data creation completed!');
    console.log('Now checking the dashboard to see if data appears...');
    
  } catch (error) {
    console.error('Error creating sample data:', error.message);
  }
}

createSampleData();