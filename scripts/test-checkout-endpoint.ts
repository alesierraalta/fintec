#!/usr/bin/env tsx
/**
 * Test script for LemonSqueezy checkout endpoint
 * 
 * Usage:
 *   npx tsx scripts/test-checkout-endpoint.ts
 * 
 * This script tests the checkout endpoint locally or on a deployed environment
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testHealthCheck() {
  console.log('\n🔍 Testing GET /api/lemonsqueezy/checkout (Health Check)...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/lemonsqueezy/checkout`, {
      method: 'GET',
    });

    console.log('Status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Health check failed:', response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return false;
    }

    const data = await response.json();
    console.log('✅ Health check passed:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check error:', error);
    return false;
  }
}

async function testCheckoutEndpoint(userId: string, tier: 'base' | 'premium') {
  console.log(`\n🔍 Testing POST /api/lemonsqueezy/checkout with userId=${userId}, tier=${tier}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/lemonsqueezy/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        tier,
      }),
    });

    console.log('Status:', response.status);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Checkout endpoint failed:', data);
      return false;
    }

    console.log('✅ Checkout endpoint succeeded:', {
      hasUrl: !!data.url,
      urlPreview: data.url ? data.url.substring(0, 50) + '...' : 'N/A'
    });
    return true;
  } catch (error) {
    console.error('❌ Checkout endpoint error:', error);
    return false;
  }
}

async function testTestEndpoint() {
  console.log('\n🔍 Testing GET /api/lemonsqueezy/checkout/test...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/lemonsqueezy/checkout/test`, {
      method: 'GET',
    });

    console.log('Status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Test endpoint failed:', response.statusText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Test endpoint passed:', data);
    return true;
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return false;
  }
}

async function testMissingParams() {
  console.log('\n🔍 Testing POST /api/lemonsqueezy/checkout with missing params...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/lemonsqueezy/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    console.log('Status:', response.status);
    
    if (response.status === 400) {
      const data = await response.json();
      console.log('✅ Correctly returns 400 for missing params:', data);
      return true;
    }

    console.error('❌ Should return 400 for missing params');
    return false;
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

async function testInvalidTier() {
  console.log('\n🔍 Testing POST /api/lemonsqueezy/checkout with invalid tier...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/lemonsqueezy/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user',
        tier: 'invalid',
      }),
    });

    console.log('Status:', response.status);
    
    if (response.status === 400) {
      const data = await response.json();
      console.log('✅ Correctly returns 400 for invalid tier:', data);
      return true;
    }

    console.error('❌ Should return 400 for invalid tier');
    return false;
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 LemonSqueezy Checkout Endpoint Tests');
  console.log('='.repeat(60));
  console.log(`Testing against: ${BASE_URL}`);
  
  const results: Record<string, boolean> = {
    healthCheck: await testHealthCheck(),
    testEndpoint: await testTestEndpoint(),
    missingParams: await testMissingParams(),
    invalidTier: await testInvalidTier(),
  };

  // Only test with real user if in local environment
  if (BASE_URL.includes('localhost') && process.env.TEST_USER_ID) {
    results['checkoutBase'] = await testCheckoutEndpoint(process.env.TEST_USER_ID, 'base');
    results['checkoutPremium'] = await testCheckoutEndpoint(process.env.TEST_USER_ID, 'premium');
  } else {
    console.log('\n⚠️  Skipping real user tests (set TEST_USER_ID env var to test with real user)');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const allPassed = Object.values(results).every(r => r);
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});



