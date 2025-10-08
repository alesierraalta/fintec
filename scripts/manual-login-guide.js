const { chromium } = require('playwright');

async function manualLoginGuide() {
  console.log('🔐 Manual Login Guide for Reports Testing\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('📋 INSTRUCTIONS:');
    console.log('1. Navigate to the login page');
    console.log('2. Use the credentials: testuser@gmail.com / password123');
    console.log('3. After login, navigate to reports page');
    console.log('4. Check if data is now loading\n');

    // Navigate to login page
    console.log('1️⃣ Opening login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');

    console.log('✅ Login page loaded');
    console.log('💡 Please manually login with: testuser@gmail.com / password123');
    console.log('⏳ Waiting for you to complete login...');

    // Wait for user to login
    await page.waitForFunction(() => {
      return window.location.href.includes('/') && !window.location.href.includes('/auth/login');
    }, { timeout: 60000 });

    console.log('✅ Login detected! Navigating to reports...');

    // Navigate to reports
    await page.goto('http://localhost:3000/reports');
    await page.waitForLoadState('networkidle');

    console.log('✅ Reports page loaded');

    // Check for data
    const dataElements = await page.locator('[data-testid*="transaction"], [data-testid*="account"], [data-testid*="category"]').count();
    console.log('📊 Data elements found:', dataElements);

    // Check for currency values
    const currencyElements = await page.locator('text=$, text=Bs, text=USD').count();
    console.log('💰 Currency elements found:', currencyElements);

    // Check for metric values
    const metricElements = await page.locator('text=0, text=$0').count();
    console.log('📈 Metric elements found:', metricElements);

    if (dataElements > 0 || currencyElements > 0) {
      console.log('🎉 SUCCESS! Data is now loading in reports!');
    } else {
      console.log('❌ Still no data found. There might be another issue.');
    }

    console.log('\n💡 Keep this browser window open to test the reports page.');

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

manualLoginGuide();
