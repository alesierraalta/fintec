// Script to check existing accounts and categories
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkData() {
  console.log('Checking existing accounts and categories...');
  
  try {
    // Check accounts
    console.log('\n=== ACCOUNTS ===');
    const accountsCommand = 'curl -s http://localhost:3002/api/accounts';
    const { stdout: accountsOutput } = await execPromise(accountsCommand);
    const accountsResult = JSON.parse(accountsOutput);
    
    if (accountsResult.success && accountsResult.data) {
      console.log(`Found ${accountsResult.data.length} accounts:`);
      accountsResult.data.forEach(account => {
        console.log(`- ID: ${account.id}, Name: ${account.name}, Type: ${account.type}`);
      });
    } else {
      console.log('No accounts found or error:', accountsResult.error);
    }
    
    // Check categories
    console.log('\n=== CATEGORIES ===');
    const categoriesCommand = 'curl -s http://localhost:3002/api/categories';
    const { stdout: categoriesOutput } = await execPromise(categoriesCommand);
    const categoriesResult = JSON.parse(categoriesOutput);
    
    if (categoriesResult.success && categoriesResult.data) {
      console.log(`Found ${categoriesResult.data.length} categories:`);
      categoriesResult.data.forEach(category => {
        console.log(`- ID: ${category.id}, Name: ${category.name}, Type: ${category.type}`);
      });
    } else {
      console.log('No categories found or error:', categoriesResult.error);
    }
    
  } catch (error) {
    console.error('Error checking data:', error.message);
  }
}

checkData();