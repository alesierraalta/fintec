const { chromium } = require('playwright');

async function directFixNaN() {
  console.log('🔧 Direct Fix for $NaN Issue\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: 'playwright/.auth/user.json'
  });
  const page = await context.newPage();

  try {
    // Navigate to transactions
    console.log('1️⃣ Opening transactions page...');
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check for NaN
    console.log('\n2️⃣ Checking for $NaN...');
    const hasNaN = await page.evaluate(() => {
      return document.body.textContent?.includes('$NaN') || false;
    });

    if (hasNaN) {
      console.log('❌ Found $NaN on page!');
      
      // Get transaction data directly from the page
      console.log('\n3️⃣ Inspecting actual React component data...');
      const componentData = await page.evaluate(() => {
        // Try to access the table rows
        const rows = document.querySelectorAll('tbody tr');
        const data = [];
        
        rows.forEach((row, index) => {
          const cells = Array.from(row.querySelectorAll('td'));
          const rowData = {
            index,
            cells: cells.map(c => c.textContent?.trim()),
            // Try to get React props
            hasReactProps: !!row._reactProps || !!row.__reactProps$ || !!row.__reactFiber$
          };
          data.push(rowData);
        });
        
        return data;
      });

      console.log(`   Found ${componentData.length} rows`);
      componentData.forEach(row => {
        console.log(`\n   Row ${row.index}:`);
        row.cells.forEach((cell, i) => {
          if (cell && (cell.includes('$') || cell.includes('NaN'))) {
            console.log(`      Cell ${i}: "${cell}" ${cell.includes('NaN') ? '❌ HAS NaN' : ''}`);
          }
        });
      });

      // Now let's see what the actual data looks like
      console.log('\n4️⃣ Checking component source code path...');
      console.log('   File: components/tables/transactions-table.tsx');
      console.log('   Expected field: amountMinor');
      console.log('   AccessorKey should be: "amountMinor"');

      // Add a monitoring script
      console.log('\n5️⃣ Injecting monitor to catch the data...');
      await page.evaluate(() => {
        // Intercept any console.log or console.error
        const originalError = console.error;
        console.error = function(...args) {
          if (args.some(arg => String(arg).includes('NaN'))) {
            document.body.insertAdjacentHTML('beforeend', 
              `<div style="position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;z-index:999999;">
                ⚠️ NaN ERROR DETECTED: ${args.join(' ')}
              </div>`
            );
          }
          originalError.apply(console, args);
        };

        // Add marker to all NaN elements
        document.querySelectorAll('*').forEach(el => {
          if (el.textContent?.includes('$NaN')) {
            el.style.border = '3px solid red';
            el.style.backgroundColor = 'rgba(255,0,0,0.1)';
          }
        });
      });

      console.log('\n6️⃣ NaN elements are now highlighted in RED');
      
      // Take screenshot
      await page.screenshot({ path: 'nan-highlighted.png', fullPage: true });
      console.log('   Screenshot saved: nan-highlighted.png');

    } else {
      console.log('✅ No $NaN found! Problem appears to be fixed.');
    }

    console.log('\n💡 Browser will stay open. Check the page and press Ctrl+C when done.');
    await page.waitForTimeout(120000); // 2 minutes

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

directFixNaN();
