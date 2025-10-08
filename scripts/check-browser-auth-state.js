const { chromium } = require('playwright');

async function checkBrowserAuthState() {
  console.log('🔍 Checking browser authentication state...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the app
    console.log('1️⃣ Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check localStorage for auth tokens
    console.log('\n2️⃣ Checking localStorage...');
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('supabase.auth.token');
    });
    console.log('Auth token in localStorage:', authToken ? 'Present' : 'Not found');

    // Check sessionStorage
    const sessionToken = await page.evaluate(() => {
      return sessionStorage.getItem('supabase.auth.token');
    });
    console.log('Auth token in sessionStorage:', sessionToken ? 'Present' : 'Not found');

    // Check for user data in localStorage
    const userData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.filter(key => key.includes('supabase') || key.includes('auth') || key.includes('user'));
    });
    console.log('Auth-related localStorage keys:', userData);

    // Navigate to reports page
    console.log('\n3️⃣ Navigating to reports page...');
    await page.goto('http://localhost:3000/reports');
    await page.waitForLoadState('networkidle');

    // Check if user is authenticated by looking for auth indicators
    console.log('\n4️⃣ Checking for authentication indicators...');
    const authIndicators = await page.locator('[data-testid*="auth"], [data-testid*="user"], [data-testid*="profile"]').count();
    console.log('Auth indicator elements found:', authIndicators);

    // Check for login/logout buttons
    const loginButton = await page.locator('text=Login, text=Iniciar sesión, text=Sign in').count();
    const logoutButton = await page.locator('text=Logout, text=Cerrar sesión, text=Sign out').count();
    console.log('Login buttons found:', loginButton);
    console.log('Logout buttons found:', logoutButton);

    // Check console for any auth-related errors
    console.log('\n5️⃣ Checking console for auth errors...');
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('auth')) {
        consoleMessages.push(msg.text());
      }
    });

    // Wait a bit to capture console messages
    await page.waitForTimeout(2000);
    console.log('Auth-related console errors:', consoleMessages);

    // Check if there are any network requests to auth endpoints
    console.log('\n6️⃣ Checking network requests...');
    const authRequests = [];
    page.on('request', request => {
      if (request.url().includes('auth') || request.url().includes('user')) {
        authRequests.push(`${request.method()} ${request.url()}`);
      }
    });

    // Reload to capture requests
    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log('Auth-related network requests:', authRequests);

    // Check if the user is redirected to login
    const currentUrl = page.url();
    console.log('\n7️⃣ Current URL:', currentUrl);
    
    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('❌ User was redirected to login page - not authenticated');
    } else {
      console.log('✅ User appears to be on the reports page');
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

checkBrowserAuthState();
