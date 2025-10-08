const { chromium } = require('playwright');

async function debugNaNWithPlaywright() {
  console.log('🔍 Debugging $NaN with Playwright...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: 'playwright/.auth/user.json' // Use saved auth state
  });
  const page = await context.newPage();

  try {
    // Navigate to transactions page
    console.log('1️⃣ Navigating to transactions...');
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Inject script to inspect the actual data
    console.log('\n2️⃣ Inspecting transaction data in page...');
    const transactionData = await page.evaluate(() => {
      // Find all text nodes containing $
      const results = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.includes('$')) {
          const parent = node.parentElement;
          results.push({
            text: text,
            parentTag: parent?.tagName,
            parentClass: parent?.className,
            hasNaN: text.includes('NaN')
          });
        }
      }

      // Try to access React state
      let reactData = null;
      try {
        // Find React root
        const root = document.querySelector('[data-reactroot], #__next, #root');
        if (root && root._reactRootContainer) {
          reactData = 'React root found';
        }
      } catch (e) {
        reactData = 'Could not access React state';
      }

      return {
        amounts: results,
        reactData: reactData,
        totalElements: results.length,
        nanCount: results.filter(r => r.hasNaN).length
      };
    });

    console.log('📊 Results:');
    console.log(`   Total amount elements: ${transactionData.totalElements}`);
    console.log(`   Elements with NaN: ${transactionData.nanCount}`);
    console.log(`   React data: ${transactionData.reactData}`);

    console.log('\n3️⃣ NaN occurrences:');
    transactionData.amounts
      .filter(a => a.hasNaN)
      .forEach((item, index) => {
        console.log(`\n   ${index + 1}. "${item.text}"`);
        console.log(`      Tag: ${item.parentTag}`);
        console.log(`      Class: ${item.parentClass}`);
      });

    // Check the actual table data
    console.log('\n4️⃣ Inspecting table rows...');
    const tableData = await page.evaluate(() => {
      const rows = [];
      const tableRows = document.querySelectorAll('tbody tr');
      
      tableRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        const rowData = {
          index: index,
          cells: Array.from(cells).map(cell => cell.textContent?.trim() || '')
        };
        rows.push(rowData);
      });

      return rows;
    });

    console.log(`   Found ${tableData.length} table rows`);
    tableData.forEach((row, index) => {
      console.log(`\n   Row ${index + 1}:`);
      row.cells.forEach((cell, cellIndex) => {
        if (cell.includes('$')) {
          console.log(`      Cell ${cellIndex}: "${cell}"`);
        }
      });
    });

    // Check the props passed to the table
    console.log('\n5️⃣ Checking component props...');
    const propsData = await page.evaluate(() => {
      // Try to find the table component and its props
      const tables = document.querySelectorAll('table');
      if (tables.length === 0) return { error: 'No tables found' };

      // Get sample transaction data from the first row
      const firstRow = document.querySelector('tbody tr');
      if (!firstRow) return { error: 'No rows found' };

      const cells = firstRow.querySelectorAll('td');
      return {
        totalTables: tables.length,
        firstRowCells: Array.from(cells).map(c => c.textContent?.trim() || ''),
        cellsWithNaN: Array.from(cells).filter(c => c.textContent?.includes('NaN')).length
      };
    });

    console.log('   Props data:', JSON.stringify(propsData, null, 2));

    // Take a screenshot
    console.log('\n6️⃣ Taking screenshot...');
    await page.screenshot({ path: 'debug-nan-screenshot.png', fullPage: true });
    console.log('   Screenshot saved: debug-nan-screenshot.png');

    // Try to fix it by injecting a script
    console.log('\n7️⃣ Attempting to fix NaN in the page...');
    const fixed = await page.evaluate(() => {
      let fixedCount = 0;
      
      // Find all text nodes with NaN
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      const nodesToFix = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent?.includes('$NaN')) {
          nodesToFix.push(node);
        }
      }

      // Replace NaN with 0.00
      nodesToFix.forEach(node => {
        node.textContent = node.textContent.replace(/\$NaN/g, '$0.00');
        fixedCount++;
      });

      return {
        fixed: fixedCount,
        message: `Fixed ${fixedCount} NaN occurrences`
      };
    });

    console.log(`   ${fixed.message}`);

    if (fixed.fixed > 0) {
      console.log('\n✅ Fixed NaN in the page (temporary)');
      console.log('💡 Now inspecting the SOURCE of the problem...');
      
      // Wait a bit to see the fix
      await page.waitForTimeout(2000);
      
      // Check the component source
      console.log('\n8️⃣ Checking React component source...');
      
      // Add a script to intercept the data
      await page.evaluate(() => {
        // Override console.log to capture data
        const originalLog = console.log;
        window.capturedLogs = [];
        console.log = function(...args) {
          window.capturedLogs.push(args);
          originalLog.apply(console, args);
        };
      });

      // Reload to see fresh data
      console.log('\n9️⃣ Reloading page to capture data flow...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Get captured logs
      const logs = await page.evaluate(() => window.capturedLogs || []);
      console.log(`   Captured ${logs.length} console logs`);
    }

    console.log('\n💡 Browser kept open for inspection. Press Ctrl+C when done.');
    await page.waitForTimeout(300000); // Wait 5 minutes

  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log(error.stack);
  } finally {
    await browser.close();
  }
}

debugNaNWithPlaywright();
