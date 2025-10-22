#!/usr/bin/env node

/**
 * Debug script to diagnose balance update issues
 * This script will help identify why balances are not updating
 */

console.log('🔍 DEBUGGING BALANCE UPDATE ISSUE');
console.log('=====================================\n');

// Test the repository setup
async function debugBalanceIssue() {
  try {
    console.log('1. Testing repository configuration...');
    
    // Import the provider
    const { SupabaseAppRepository } = require('../repositories/supabase');
    
    console.log('✅ SupabaseAppRepository imported successfully');
    
    // Create repository instance
    const repository = new SupabaseAppRepository();
    console.log('✅ Repository instance created');
    
    // Check if transactions repository has accounts repository set
    console.log('\n2. Checking repository dependencies...');
    if (repository.transactions.accountsRepository) {
      console.log('✅ Transactions repository has accounts repository dependency');
    } else {
      console.log('❌ Transactions repository missing accounts repository dependency');
    }
    
    // Test account balance methods
    console.log('\n3. Testing account repository methods...');
    
    // Get all accounts first
    console.log('Fetching accounts...');
    const accounts = await repository.accounts.findAll();
    console.log(`Found ${accounts.length} accounts`);
    
    if (accounts.length > 0) {
      const firstAccount = accounts[0];
      console.log(`Testing with account: ${firstAccount.name} (${firstAccount.id})`);
      console.log(`Current balance: ${firstAccount.balance / 100}`);
      
      // Test adjust balance method
      console.log('\n4. Testing balance adjustment...');
      try {
        const testAdjustment = 1000; // $10.00
        console.log(`Attempting to adjust balance by ${testAdjustment / 100}...`);
        
        const updatedAccount = await repository.accounts.adjustBalance(firstAccount.id, testAdjustment);
        console.log(`✅ Balance adjustment successful`);
        console.log(`New balance: ${updatedAccount.balance / 100}`);
        
        // Reverse the test adjustment
        await repository.accounts.adjustBalance(firstAccount.id, -testAdjustment);
        console.log(`✅ Test adjustment reversed`);
        
      } catch (error) {
        console.log(`❌ Balance adjustment failed: ${error.message}`);
      }
    }
    
    // Test transaction creation
    console.log('\n5. Testing transaction creation with balance update...');
    
    if (accounts.length > 0) {
      const testAccount = accounts[0];
      const originalBalance = testAccount.balance;
      
      console.log(`Original balance: ${originalBalance / 100}`);
      
      // Create a test transaction
      const testTransaction = {
        type: 'INCOME',
        accountId: testAccount.id,
        categoryId: null, // We'll need a valid category ID
        currencyCode: testAccount.currencyCode,
        amountMinor: 5000, // $50.00
        date: new Date().toISOString().split('T')[0],
        description: 'Test transaction for debugging'
      };
      
      try {
        console.log('Creating test transaction...');
        const createdTransaction = await repository.transactions.create(testTransaction);
        console.log(`✅ Transaction created: ${createdTransaction.id}`);
        
        // Check if balance was updated
        const updatedAccount = await repository.accounts.findById(testAccount.id);
        console.log(`Updated balance: ${updatedAccount.balance / 100}`);
        
        if (updatedAccount.balance !== originalBalance) {
          console.log('✅ Balance was updated correctly!');
        } else {
          console.log('❌ Balance was NOT updated');
        }
        
        // Clean up - delete test transaction
        await repository.transactions.delete(createdTransaction.id);
        console.log('✅ Test transaction cleaned up');
        
      } catch (error) {
        console.log(`❌ Transaction creation failed: ${error.message}`);
        console.log('Full error:', error);
      }
    }
    
  } catch (error) {
    console.log(`❌ Debug script failed: ${error.message}`);
    console.log('Full error:', error);
  }
}

// Run the debug script
if (require.main === module) {
  debugBalanceIssue().catch(error => {
    console.error('💥 Debug script crashed:', error);
    process.exit(1);
  });
}

module.exports = { debugBalanceIssue };



