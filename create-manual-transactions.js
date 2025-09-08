// Script to manually create sample transactions
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Sample transactions data
const transactions = [
  {
    accountId: '1',
    amountMinor: $1, // $$$1 in cents
    currencyCode: 'USD',
    type: 'INCOME',
    categoryId: '1',
    description: 'Salary Payment',
    date: new Date().toISOString()
  },
  {
    accountId: '1', 
    amountMinor: $1, // $$$1 in cents
    currencyCode: 'USD',
    type: 'INCOME', 
    categoryId: '2',
    description: 'Freelance Project',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    accountId: '1',
    amountMinor: $1, // $$$1 in cents
    currencyCode: 'USD',
    type: 'EXPENSE',
    categoryId: '5', // Alimentación
    description: 'Groceries and Food',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    accountId: '1',
    amountMinor: $1, // $$$1 in cents
    currencyCode: 'USD', 
    type: 'EXPENSE',
    categoryId: '8', // Servicios
    description: 'Rent Payment',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    accountId: '1',
    amountMinor: $1, // $$$1 in cents
    currencyCode: 'USD',
    type: 'EXPENSE', 
    categoryId: '6', // Transporte
    description: 'Gas and Transportation',
    date: new Date().toISOString()
  }
];

async function createTransactions() {
  console.log('Creating sample transactions manually...');
  
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    console.log(`\nCreating transaction ${i + 1}: ${transaction.description}`);
    
    try {
      // Create PowerShell command to POST transaction
      const jsonBody = JSON.stringify(transaction);
      const escapedJson = jsonBody.replace(/"/g, '\\"');
      
      const command = `powershell -Command "$headers = @{'Content-Type' = 'application/json'}; $body = '${escapedJson}'; try { $response = Invoke-RestMethod -Uri 'http://localhost:3002/api/transactions' -Method POST -Headers $headers -Body $body; Write-Output ($response | ConvertTo-Json -Compress) } catch { Write-Output ('{\"success\": false, \"error\": \"' + $_.Exception.Message + '\"}') }"`;
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr) {
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
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n✓ Finished creating sample transactions!');
}

createTransactions();