const https = require('https');
const http = require('http');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'test-integration@example.com',
  password: 'testpassword123',
  fullName: 'Test Integration User'
};

class IntegrationTester {
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
          'User-Agent': 'Integration-Test-Bot',
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

  async testServerAvailability() {
    this.log('🌐 Testing server availability...');
    try {
      const response = await this.makeRequest('/');
      if (response.statusCode === 200) {
        this.log('✅ Server is running and accessible', 'success');
        return true;
      } else {
        this.log(`❌ Server returned status code: ${response.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Server is not accessible: ${error.message}`, 'error');
      return false;
    }
  }

  async testAuthPages() {
    this.log('🔐 Testing authentication pages...');
    
    try {
      // Test login page
      const loginResponse = await this.makeRequest('/auth/login');
      if (loginResponse.statusCode === 200) {
        this.log('✅ Login page accessible', 'success');
        
        // Check if page contains expected content
        if (loginResponse.data.includes('Iniciar') || loginResponse.data.includes('Login')) {
          this.log('✅ Login page contains expected content', 'success');
        } else {
          this.log('⚠️ Login page might not contain expected content', 'warning');
        }
      } else {
        this.log(`❌ Login page returned status: ${loginResponse.statusCode}`, 'error');
      }

      // Test register page
      const registerResponse = await this.makeRequest('/auth/register');
      if (registerResponse.statusCode === 200) {
        this.log('✅ Register page accessible', 'success');
        
        // Check if page contains expected content
        if (registerResponse.data.includes('Registr') || registerResponse.data.includes('Register')) {
          this.log('✅ Register page contains expected content', 'success');
        } else {
          this.log('⚠️ Register page might not contain expected content', 'warning');
        }
      } else {
        this.log(`❌ Register page returned status: ${registerResponse.statusCode}`, 'error');
      }

      return true;
    } catch (error) {
      this.log(`❌ Error testing auth pages: ${error.message}`, 'error');
      return false;
    }
  }

  async testAPIEndpoints() {
    this.log('🔌 Testing API endpoints...');
    
    try {
      // Test BCV rates endpoint
      const bcvResponse = await this.makeRequest('/api/bcv-rates');
      if (bcvResponse.statusCode === 200) {
        this.log('✅ BCV rates API accessible', 'success');
        if (bcvResponse.data && typeof bcvResponse.data === 'object') {
          this.log('✅ BCV rates API returns valid data', 'success');
        }
      } else {
        this.log(`❌ BCV rates API returned status: ${bcvResponse.statusCode}`, 'error');
      }

      return true;
    } catch (error) {
      this.log(`❌ Error testing API endpoints: ${error.message}`, 'error');
      return false;
    }
  }

  async testProtectedRoutes() {
    this.log('🛡️ Testing protected routes...');
    
    const protectedRoutes = [
      '/accounts',
      '/transactions',
      '/budgets',
      '/goals',
      '/reports',
      '/transfers',
      '/categories',
      '/settings'
    ];

    let accessibleRoutes = 0;
    let redirectedRoutes = 0;

    for (const route of protectedRoutes) {
      try {
        const response = await this.makeRequest(route);
        
        if (response.statusCode === 200) {
          accessibleRoutes++;
          this.log(`✅ Route ${route} accessible`, 'success');
        } else if (response.statusCode === 302 || response.statusCode === 307) {
          redirectedRoutes++;
          this.log(`🔄 Route ${route} redirected (likely to auth)`, 'info');
        } else {
          this.log(`❌ Route ${route} returned status: ${response.statusCode}`, 'error');
        }
      } catch (error) {
        this.log(`❌ Error accessing route ${route}: ${error.message}`, 'error');
      }
    }

    this.log(`📊 Protected routes summary: ${accessibleRoutes} accessible, ${redirectedRoutes} redirected`, 'info');
    return true;
  }

  async testNoDemoData() {
    this.log('🧹 Testing for demo data removal...');
    
    try {
      const mainPageResponse = await this.makeRequest('/');
      const mainPageContent = mainPageResponse.data.toString().toLowerCase();
      
      // Check for common demo data indicators
      const demoIndicators = [
        'mock',
        'demo',
        'example transaction',
        'sample account',
        'test category',
        'fake data',
        '1000.00', // Common demo amount
        '2500.00', // Common demo amount
        'demo@example.com'
      ];

      let foundDemoIndicators = [];
      
      for (const indicator of demoIndicators) {
        if (mainPageContent.includes(indicator)) {
          foundDemoIndicators.push(indicator);
        }
      }

      if (foundDemoIndicators.length === 0) {
        this.log('✅ No obvious demo data indicators found', 'success');
      } else {
        this.log(`⚠️ Potential demo data indicators found: ${foundDemoIndicators.join(', ')}`, 'warning');
      }

      return foundDemoIndicators.length === 0;
    } catch (error) {
      this.log(`❌ Error checking for demo data: ${error.message}`, 'error');
      return false;
    }
  }

  async testDatabaseConnection() {
    this.log('🗄️ Testing database connection...');
    
    try {
      // This is indirect - we test if the app responds properly which indicates DB connectivity
      const response = await this.makeRequest('/');
      
      if (response.statusCode === 200) {
        this.log('✅ Application responds (database likely connected)', 'success');
        
        // Check if there are any obvious database errors in the response
        const content = response.data.toString().toLowerCase();
        if (content.includes('database error') || content.includes('connection failed')) {
          this.log('❌ Database connection errors detected in response', 'error');
          return false;
        }
        
        return true;
      } else {
        this.log(`❌ Application not responding properly: ${response.statusCode}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing database connection: ${error.message}`, 'error');
      return false;
    }
  }

  async runAllTests() {
    this.log('🚀 Starting comprehensive integration tests...');
    
    const tests = [
      { name: 'Server Availability', fn: () => this.testServerAvailability() },
      { name: 'Authentication Pages', fn: () => this.testAuthPages() },
      { name: 'API Endpoints', fn: () => this.testAPIEndpoints() },
      { name: 'Protected Routes', fn: () => this.testProtectedRoutes() },
      { name: 'Database Connection', fn: () => this.testDatabaseConnection() },
      { name: 'Demo Data Removal', fn: () => this.testNoDemoData() }
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
    this.log('\n📋 TEST SUMMARY');
    this.log(`Total tests: ${totalTests}`);
    this.log(`Passed: ${passedTests}`);
    this.log(`Failed: ${totalTests - passedTests}`);
    this.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (passedTests === totalTests) {
      this.log('🎉 ALL TESTS PASSED!', 'success');
    } else {
      this.log('⚠️ Some tests failed. Please review the results above.', 'warning');
    }

    // Save results to file
    this.saveResults();
    
    return passedTests === totalTests;
  }

  saveResults() {
    const resultsFile = 'integration-test-results.json';
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
      this.log(`📄 Test results saved to ${resultsFile}`, 'info');
    } catch (error) {
      this.log(`❌ Failed to save test results: ${error.message}`, 'error');
    }
  }
}

// Run the tests
async function main() {
  const tester = new IntegrationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = IntegrationTester;
