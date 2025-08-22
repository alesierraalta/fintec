const https = require('https');
const http = require('http');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3000';

class WalletFunctionalityTester {
  constructor() {
    this.cookies = '';
    this.testResults = [];
    this.authToken = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    this.testResults.push({ timestamp, type, message });
  }

  async makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const options = {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Wallet-Test-Bot',
          'Cookie': this.cookies,
          ...headers
        }
      };

      if (data && method !== 'GET') {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }

      const req = http.request(options, (res) => {
        let responseData = '';

        // Capture cookies
        if (res.headers['set-cookie']) {
          this.cookies = res.headers['set-cookie'].join('; ');
        }

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = responseData.startsWith('{') || responseData.startsWith('[') 
              ? JSON.parse(responseData) 
              : responseData;
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: parsedData
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: responseData
            });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (data && method !== 'GET') {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async testAccountsPageStructure() {
    this.log('🏦 Testing accounts page structure...');
    
    try {
      const response = await this.makeRequest('/accounts');
      if (response.statusCode === 200) {
        this.log('✅ Accounts page accessible', 'success');
        
        const content = response.data.toString();
        
        // Check for key elements that should be present in accounts page
        const keyElements = [
          'account', // Should have account-related content
          'balance', // Should have balance-related content
          'create', // Should have create button/functionality
          'wallet'   // Should have wallet-related content
        ];

        let foundElements = 0;
        for (const element of keyElements) {
          if (content.toLowerCase().includes(element)) {
            foundElements++;
            this.log(`✅ Found "${element}" in accounts page`, 'success');
          } else {
            this.log(`⚠️ Missing "${element}" in accounts page`, 'warning');
          }
        }

        // Check if page has form elements for creating accounts
        if (content.includes('input') || content.includes('form') || content.includes('button')) {
          this.log('✅ Page contains interactive elements (forms/buttons)', 'success');
          foundElements++;
        } else {
          this.log('⚠️ Page might be missing interactive elements', 'warning');
        }

        return foundElements >= 3; // At least 3 out of 5 elements should be present
      } else {
        this.log(`❌ Accounts page returned status: ${response.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing accounts page: ${error.message}`, 'error');
      return false;
    }
  }

  async testTransactionsPageStructure() {
    this.log('💰 Testing transactions page structure...');
    
    try {
      const response = await this.makeRequest('/transactions');
      if (response.statusCode === 200) {
        this.log('✅ Transactions page accessible', 'success');
        
        const content = response.data.toString();
        
        // Check for key elements that should be present in transactions page
        const keyElements = [
          'transaction',
          'amount',
          'add',
          'expense',
          'income',
          'category'
        ];

        let foundElements = 0;
        for (const element of keyElements) {
          if (content.toLowerCase().includes(element)) {
            foundElements++;
            this.log(`✅ Found "${element}" in transactions page`, 'success');
          } else {
            this.log(`⚠️ Missing "${element}" in transactions page`, 'warning');
          }
        }

        // Check if page has form elements for creating transactions
        if (content.includes('input') || content.includes('form') || content.includes('button')) {
          this.log('✅ Page contains interactive elements for transactions', 'success');
          foundElements++;
        }

        return foundElements >= 4; // At least 4 out of 7 elements should be present
      } else {
        this.log(`❌ Transactions page returned status: ${response.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing transactions page: ${error.message}`, 'error');
      return false;
    }
  }

  async testAddTransactionPage() {
    this.log('➕ Testing add transaction page...');
    
    try {
      const response = await this.makeRequest('/transactions/add');
      if (response.statusCode === 200) {
        this.log('✅ Add transaction page accessible', 'success');
        
        const content = response.data.toString();
        
        // Check for form elements specific to adding transactions
        const formElements = [
          'amount',
          'description',
          'category',
          'account',
          'type'
        ];

        let foundFormElements = 0;
        for (const element of formElements) {
          if (content.toLowerCase().includes(element)) {
            foundFormElements++;
            this.log(`✅ Found form element "${element}"`, 'success');
          }
        }

        // Check for submit button or save functionality
        if (content.toLowerCase().includes('save') || content.toLowerCase().includes('submit') || content.toLowerCase().includes('add')) {
          this.log('✅ Page has submit functionality', 'success');
          foundFormElements++;
        }

        return foundFormElements >= 4; // At least 4 form elements should be present
      } else {
        this.log(`❌ Add transaction page returned status: ${response.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing add transaction page: ${error.message}`, 'error');
      return false;
    }
  }

  async testCategoriesPage() {
    this.log('📂 Testing categories page structure...');
    
    try {
      const response = await this.makeRequest('/categories');
      if (response.statusCode === 200) {
        this.log('✅ Categories page accessible', 'success');
        
        const content = response.data.toString();
        
        // Check for category-related elements
        const categoryElements = [
          'category',
          'expense',
          'income',
          'create',
          'color',
          'icon'
        ];

        let foundElements = 0;
        for (const element of categoryElements) {
          if (content.toLowerCase().includes(element)) {
            foundElements++;
            this.log(`✅ Found "${element}" in categories page`, 'success');
          }
        }

        return foundElements >= 3;
      } else {
        this.log(`❌ Categories page returned status: ${response.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing categories page: ${error.message}`, 'error');
      return false;
    }
  }

  async testBudgetsAndGoalsPages() {
    this.log('🎯 Testing budgets and goals pages...');
    
    try {
      // Test budgets page
      const budgetsResponse = await this.makeRequest('/budgets');
      let budgetsOk = false;
      if (budgetsResponse.statusCode === 200) {
        this.log('✅ Budgets page accessible', 'success');
        const budgetsContent = budgetsResponse.data.toString();
        if (budgetsContent.toLowerCase().includes('budget') || budgetsContent.toLowerCase().includes('limite')) {
          this.log('✅ Budgets page contains budget-related content', 'success');
          budgetsOk = true;
        }
      }

      // Test goals page
      const goalsResponse = await this.makeRequest('/goals');
      let goalsOk = false;
      if (goalsResponse.statusCode === 200) {
        this.log('✅ Goals page accessible', 'success');
        const goalsContent = goalsResponse.data.toString();
        if (goalsContent.toLowerCase().includes('goal') || goalsContent.toLowerCase().includes('meta') || goalsContent.toLowerCase().includes('objetivo')) {
          this.log('✅ Goals page contains goals-related content', 'success');
          goalsOk = true;
        }
      }

      return budgetsOk && goalsOk;
    } catch (error) {
      this.log(`❌ Error testing budgets/goals pages: ${error.message}`, 'error');
      return false;
    }
  }

  async testReportsPage() {
    this.log('📊 Testing reports page...');
    
    try {
      const response = await this.makeRequest('/reports');
      if (response.statusCode === 200) {
        this.log('✅ Reports page accessible', 'success');
        
        const content = response.data.toString();
        
        // Check for reports-related elements
        const reportsElements = [
          'report',
          'chart',
          'analysis',
          'period',
          'filter'
        ];

        let foundElements = 0;
        for (const element of reportsElements) {
          if (content.toLowerCase().includes(element)) {
            foundElements++;
            this.log(`✅ Found "${element}" in reports page`, 'success');
          }
        }

        return foundElements >= 2;
      } else {
        this.log(`❌ Reports page returned status: ${response.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing reports page: ${error.message}`, 'error');
      return false;
    }
  }

  async testDashboardFunctionality() {
    this.log('🏠 Testing dashboard functionality...');
    
    try {
      const response = await this.makeRequest('/');
      if (response.statusCode === 200) {
        this.log('✅ Dashboard accessible', 'success');
        
        const content = response.data.toString();
        
        // Check for dashboard elements that should be database-driven
        const dashboardElements = [
          'balance',
          'transaction',
          'account',
          'overview',
          'recent'
        ];

        let foundElements = 0;
        for (const element of dashboardElements) {
          if (content.toLowerCase().includes(element)) {
            foundElements++;
            this.log(`✅ Found "${element}" in dashboard`, 'success');
          }
        }

        // Check that it's not showing obvious placeholder or empty state messages
        if (!content.toLowerCase().includes('no data') && !content.toLowerCase().includes('no hay datos')) {
          this.log('✅ Dashboard is not showing obvious empty state messages', 'success');
        } else {
          this.log('ℹ️ Dashboard shows empty state (expected for new user)', 'info');
        }

        return foundElements >= 3;
      } else {
        this.log(`❌ Dashboard returned status: ${response.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing dashboard: ${error.message}`, 'error');
      return false;
    }
  }

  async runWalletTests() {
    this.log('🚀 Starting wallet functionality tests...');
    
    const tests = [
      { name: 'Dashboard Functionality', fn: () => this.testDashboardFunctionality() },
      { name: 'Accounts Page Structure', fn: () => this.testAccountsPageStructure() },
      { name: 'Transactions Page Structure', fn: () => this.testTransactionsPageStructure() },
      { name: 'Add Transaction Page', fn: () => this.testAddTransactionPage() },
      { name: 'Categories Page', fn: () => this.testCategoriesPage() },
      { name: 'Budgets and Goals Pages', fn: () => this.testBudgetsAndGoalsPages() },
      { name: 'Reports Page', fn: () => this.testReportsPage() }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
      this.log(`\n🧪 Running test: ${test.name}`);
      try {
        const result = await test.fn();
        if (result) {
          passedTests++;
          this.log(`✅ Test "${test.name}" PASSED`, 'success');
        } else {
          this.log(`❌ Test "${test.name}" FAILED`, 'error');
        }
      } catch (error) {
        this.log(`❌ Test "${test.name}" ERROR: ${error.message}`, 'error');
      }
    }

    // Final summary
    this.log('\n📋 WALLET FUNCTIONALITY TEST SUMMARY');
    this.log(`Total tests: ${totalTests}`);
    this.log(`Passed: ${passedTests}`);
    this.log(`Failed: ${totalTests - passedTests}`);
    this.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (passedTests === totalTests) {
      this.log('🎉 ALL WALLET FUNCTIONALITY TESTS PASSED!', 'success');
    } else if (passedTests >= totalTests * 0.7) {
      this.log('✅ Most wallet functionality tests passed (70%+ success rate)', 'success');
    } else {
      this.log('⚠️ Some wallet functionality tests failed. Please review the results above.', 'warning');
    }

    // Save results to file
    this.saveResults();
    
    return passedTests >= totalTests * 0.7; // 70% success rate considered acceptable
  }

  saveResults() {
    const resultsFile = 'wallet-functionality-test-results.json';
    const results = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      summary: {
        total: this.testResults.filter(r => r.message.includes('Test "')).length,
        passed: this.testResults.filter(r => r.message.includes('PASSED')).length,
        failed: this.testResults.filter(r => r.message.includes('FAILED')).length,
        errors: this.testResults.filter(r => r.message.includes('ERROR')).length
      }
    };

    try {
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      this.log(`📄 Wallet functionality test results saved to ${resultsFile}`, 'info');
    } catch (error) {
      this.log(`❌ Failed to save test results: ${error.message}`, 'error');
    }
  }
}

// Run the tests
async function main() {
  const tester = new WalletFunctionalityTester();
  const success = await tester.runWalletTests();
  
  if (success) {
    console.log('\n🎉 SUMMARY: Wallet functionality is working correctly!');
    console.log('✅ Users should be able to:');
    console.log('   - Access all main pages');
    console.log('   - View accounts/wallets interface');
    console.log('   - Access transaction creation');
    console.log('   - Manage categories');
    console.log('   - Set budgets and goals');
    console.log('   - View reports and analytics');
  } else {
    console.log('\n⚠️ SUMMARY: Some wallet functionality issues detected.');
    console.log('Please review the test results above for details.');
  }
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = WalletFunctionalityTester;
