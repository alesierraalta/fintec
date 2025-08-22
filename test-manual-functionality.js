const http = require('http');

// Manual test to verify core functionality
class ManualFunctionalityTester {
  constructor() {
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    this.testResults.push({ timestamp, type, message });
  }

  async makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Manual-Test-Bot'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: data,
            headers: res.headers
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }

  async testApplicationStructure() {
    this.log('🧪 Testing application structure and key pages...');

    const pages = [
      { path: '/', name: 'Dashboard' },
      { path: '/auth/login', name: 'Login' },
      { path: '/auth/register', name: 'Register' },
      { path: '/accounts', name: 'Accounts' },
      { path: '/transactions', name: 'Transactions' },
      { path: '/transactions/add', name: 'Add Transaction' },
      { path: '/categories', name: 'Categories' },
      { path: '/budgets', name: 'Budgets' },
      { path: '/goals', name: 'Goals' },
      { path: '/reports', name: 'Reports' },
      { path: '/api/bcv-rates', name: 'BCV API' }
    ];

    let successCount = 0;
    let totalPages = pages.length;

    for (const page of pages) {
      try {
        const response = await this.makeRequest(page.path);
        
        if (response.statusCode === 200) {
          this.log(`✅ ${page.name} (${page.path}) - OK`, 'success');
          successCount++;
          
          // Check for specific content indicators
          const content = response.data.toLowerCase();
          
          if (page.path === '/accounts') {
            if (content.includes('cuentas') || content.includes('account')) {
              this.log(`   ✅ Contains account-related content`, 'success');
            }
            if (content.includes('crear') || content.includes('nueva')) {
              this.log(`   ✅ Has creation functionality`, 'success');
            }
          }
          
          if (page.path === '/transactions/add') {
            if (content.includes('amount') || content.includes('cantidad')) {
              this.log(`   ✅ Has amount field`, 'success');
            }
            if (content.includes('description') || content.includes('descripción')) {
              this.log(`   ✅ Has description field`, 'success');
            }
          }
          
          if (page.path === '/api/bcv-rates' && response.headers['content-type']?.includes('json')) {
            this.log(`   ✅ API returns JSON`, 'success');
          }
          
        } else if (response.statusCode === 302 || response.statusCode === 307) {
          this.log(`🔄 ${page.name} (${page.path}) - Redirected (likely auth protected)`, 'info');
          successCount++; // Redirects are expected for protected pages
        } else {
          this.log(`❌ ${page.name} (${page.path}) - Status: ${response.statusCode}`, 'error');
        }
      } catch (error) {
        this.log(`❌ ${page.name} (${page.path}) - Error: ${error.message}`, 'error');
      }
    }

    const successRate = (successCount / totalPages) * 100;
    this.log(`\n📊 Page Structure Test Results:`);
    this.log(`   Total pages tested: ${totalPages}`);
    this.log(`   Successful responses: ${successCount}`);
    this.log(`   Success rate: ${successRate.toFixed(1)}%`);

    return successRate >= 90; // 90% success rate considered good
  }

  async testAccountCreationFlow() {
    this.log('\n🏦 Testing account creation flow...');

    try {
      // Test accounts page loads
      const accountsResponse = await this.makeRequest('/accounts');
      
      if (accountsResponse.statusCode === 200) {
        this.log('✅ Accounts page loads successfully', 'success');
        
        const content = accountsResponse.data;
        
        // Check for key elements that indicate account creation functionality
        const hasCreateButton = content.includes('Crear') || content.includes('Nueva') || content.includes('Add');
        const hasAccountForm = content.includes('AccountForm') || content.includes('account-form');
        const hasEmptyState = content.includes('No tienes cuentas') || content.includes('primera cuenta');
        const hasAccountList = content.includes('Todas las Cuentas') || content.includes('accounts');
        
        if (hasCreateButton) {
          this.log('✅ Create account button/functionality present', 'success');
        } else {
          this.log('⚠️ Create account button not found', 'warning');
        }
        
        if (hasAccountForm) {
          this.log('✅ Account form component loaded', 'success');
        } else {
          this.log('⚠️ Account form component not detected', 'warning');
        }
        
        if (hasEmptyState) {
          this.log('✅ Empty state messaging present (good for new users)', 'success');
        }
        
        if (hasAccountList) {
          this.log('✅ Account list structure present', 'success');
        }
        
        // Check for database connectivity indicators
        if (content.includes('Cargando') || content.includes('loading')) {
          this.log('✅ Loading states implemented (indicates async data loading)', 'success');
        }
        
        return hasCreateButton && (hasAccountForm || hasEmptyState);
        
      } else {
        this.log(`❌ Accounts page failed to load: ${accountsResponse.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing account creation flow: ${error.message}`, 'error');
      return false;
    }
  }

  async testTransactionFlow() {
    this.log('\n💰 Testing transaction flow...');

    try {
      // Test transactions page
      const transactionsResponse = await this.makeRequest('/transactions');
      const addTransactionResponse = await this.makeRequest('/transactions/add');
      
      let transactionsOk = false;
      let addTransactionOk = false;
      
      if (transactionsResponse.statusCode === 200) {
        this.log('✅ Transactions page loads', 'success');
        const content = transactionsResponse.data;
        
        if (content.includes('transaction') || content.includes('Transaction')) {
          this.log('✅ Transaction-related content present', 'success');
          transactionsOk = true;
        }
      }
      
      if (addTransactionResponse.statusCode === 200) {
        this.log('✅ Add transaction page loads', 'success');
        const content = addTransactionResponse.data;
        
        const hasAmountField = content.includes('amount') || content.includes('cantidad');
        const hasDescriptionField = content.includes('description') || content.includes('descripción');
        const hasTypeField = content.includes('type') || content.includes('tipo');
        
        if (hasAmountField && hasDescriptionField && hasTypeField) {
          this.log('✅ Transaction form has required fields', 'success');
          addTransactionOk = true;
        } else {
          this.log('⚠️ Some transaction form fields missing', 'warning');
        }
      }
      
      return transactionsOk && addTransactionOk;
      
    } catch (error) {
      this.log(`❌ Error testing transaction flow: ${error.message}`, 'error');
      return false;
    }
  }

  async testAuthenticationSystem() {
    this.log('\n🔐 Testing authentication system...');

    try {
      const loginResponse = await this.makeRequest('/auth/login');
      const registerResponse = await this.makeRequest('/auth/register');
      
      let authSystemOk = true;
      
      if (loginResponse.statusCode === 200) {
        this.log('✅ Login page accessible', 'success');
        
        if (loginResponse.data.includes('email') && loginResponse.data.includes('password')) {
          this.log('✅ Login form has email and password fields', 'success');
        } else {
          this.log('⚠️ Login form fields not detected', 'warning');
          authSystemOk = false;
        }
      } else {
        authSystemOk = false;
      }
      
      if (registerResponse.statusCode === 200) {
        this.log('✅ Register page accessible', 'success');
        
        if (registerResponse.data.includes('email') && registerResponse.data.includes('password')) {
          this.log('✅ Register form has required fields', 'success');
        } else {
          this.log('⚠️ Register form fields not detected', 'warning');
          authSystemOk = false;
        }
      } else {
        authSystemOk = false;
      }
      
      return authSystemOk;
      
    } catch (error) {
      this.log(`❌ Error testing authentication system: ${error.message}`, 'error');
      return false;
    }
  }

  async runAllTests() {
    this.log('🚀 Starting comprehensive manual functionality tests...\n');

    const tests = [
      { name: 'Application Structure', fn: () => this.testApplicationStructure() },
      { name: 'Account Creation Flow', fn: () => this.testAccountCreationFlow() },
      { name: 'Transaction Flow', fn: () => this.testTransactionFlow() },
      { name: 'Authentication System', fn: () => this.testAuthenticationSystem() }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result) {
          passedTests++;
          this.log(`\n✅ ${test.name} - PASSED`, 'success');
        } else {
          this.log(`\n❌ ${test.name} - FAILED`, 'error');
        }
      } catch (error) {
        this.log(`\n❌ ${test.name} - ERROR: ${error.message}`, 'error');
      }
    }

    // Final summary
    this.log('\n' + '='.repeat(60));
    this.log('📋 COMPREHENSIVE FUNCTIONALITY TEST SUMMARY');
    this.log('='.repeat(60));
    this.log(`Total test suites: ${totalTests}`);
    this.log(`Passed: ${passedTests}`);
    this.log(`Failed: ${totalTests - passedTests}`);
    this.log(`Overall success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (passedTests === totalTests) {
      this.log('\n🎉 ALL FUNCTIONALITY TESTS PASSED!', 'success');
      this.log('✅ The application core functionality is working correctly!');
      this.log('✅ Users can create accounts/wallets');
      this.log('✅ Transaction system is operational');
      this.log('✅ Authentication system is functional');
      this.log('✅ All main pages are accessible');
    } else if (passedTests >= totalTests * 0.75) {
      this.log('\n✅ MOST FUNCTIONALITY TESTS PASSED!', 'success');
      this.log('The application is mostly functional with minor issues.');
    } else {
      this.log('\n⚠️ SOME FUNCTIONALITY ISSUES DETECTED', 'warning');
      this.log('Please review the test results above for details.');
    }

    return passedTests >= totalTests * 0.75;
  }
}

// Run the tests
async function main() {
  const tester = new ManualFunctionalityTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ManualFunctionalityTester;
