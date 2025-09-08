// Debug script to check transactions in database
console.log('Checking transactions via API...');

// Use PowerShell Invoke-WebRequest to check the API
const { exec } = require('child_process');

exec('powershell -Command "try { $response = Invoke-WebRequest -Uri http://localhost:3002/api/transactions -UseBasicParsing; $response.Content } catch { Write-Output \"Error: $($_.Exception.Message)\" }"', (error, stdout, stderr) => {
  if (error) {
    console.error('Error calling API:', error.message);
    return;
  }
  
  if (stderr) {
    console.error('Stderr:', stderr);
    return;
  }
  
  try {
    const response = JSON.parse(stdout.trim());
    
    if (response.success) {
      const transactions = response.data;
      console.log('Total transactions found:', transactions.length);
      
      if (transactions.length > 0) {
        console.log('Sample transaction:', JSON.stringify(transactions[0], null, 2));
        
        // Count by type
        const income = transactions.filter(t => t.type === 'INCOME').length;
        const expense = transactions.filter(t => t.type === 'EXPENSE').length;
        
        console.log('Income transactions:', income);
        console.log('Expense transactions:', expense);
      } else {
        console.log('No transactions found in database');
      }
    } else {
      console.log('API Error:', response.error);
      console.log('Details:', response.details);
    }
  } catch (parseError) {
    console.log('Raw API response:', stdout);
    console.error('Error parsing JSON:', parseError.message);
  }
});