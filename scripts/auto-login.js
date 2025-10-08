const { chromium } = require('playwright');

async function autoLogin() {
  console.log('🔐 Automating login process...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');

    // Check if login form is present
    console.log('2️⃣ Checking for login form...');
    const emailInput = await page.locator('input[type="email"], input[name="email"]').count();
    const passwordInput = await page.locator('input[type="password"], input[name="password"]').count();
    const submitButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Iniciar sesión")').count();

    console.log('Email input found:', emailInput);
    console.log('Password input found:', passwordInput);
    console.log('Submit button found:', submitButton);

    if (emailInput === 0 || passwordInput === 0 || submitButton === 0) {
      console.log('❌ Login form not found or incomplete');
      return;
    }

    // Fill login form
    console.log('3️⃣ Filling login form...');
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');

    // Submit form
    console.log('4️⃣ Submitting login form...');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Iniciar sesión")');
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    
    // Check if login was successful
    console.log('5️⃣ Checking login result...');
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);

    if (currentUrl.includes('login')) {
      console.log('❌ Still on login page - login may have failed');
    } else {
      console.log('✅ Successfully navigated away from login page');
    }

    // Check for auth token
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('supabase.auth.token');
    });
    console.log('Auth token after login:', authToken ? 'Present' : 'Not found');

    // Navigate to reports to test
    console.log('\n6️⃣ Testing reports page...');
    await page.goto('http://localhost:3000/reports');
    await page.waitForLoadState('networkidle');

    // Check if data is now loading
    const dataElements = await page.locator('[data-testid*="transaction"], [data-testid*="account"], [data-testid*="category"]').count();
    console.log('Data elements found:', dataElements);

    // Check for metric values
    const metricElements = await page.locator('text=$, text=Bs, text=USD').count();
    console.log('Currency elements found:', metricElements);

  } catch (error) {
    console.log('❌ Error during login:', error.message);
  } finally {
    await browser.close();
  }
}

autoLogin();
