const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Verificando fix de $NaN en reportes...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to reports
    console.log('1️⃣ Navegando a /reports...');
    await page.goto('http://localhost:3000/reports', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Check for NaN in page
    console.log('2️⃣ Buscando $NaN en la página...\n');
    const bodyText = await page.textContent('body');
    
    const hasNaN = bodyText.includes('$NaN') || bodyText.includes('NaN');
    
    if (hasNaN) {
      console.log('❌ TODAVÍA HAY $NaN en la página');
      
      // Find exact locations
      const nanLocations = await page.evaluate(() => {
        const results = [];
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );

        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && (text.includes('$NaN') || text.includes('NaN'))) {
            results.push({
              text,
              parentElement: node.parentElement?.tagName,
              parentClass: node.parentElement?.className
            });
          }
        }
        return results;
      });

      console.log('📍 Ubicaciones con NaN:');
      nanLocations.forEach((loc, i) => {
        console.log(`   ${i + 1}. ${loc.parentElement}.${loc.parentClass}: "${loc.text}"`);
      });
    } else {
      console.log('✅ NO HAY $NaN en la página!');
    }

    // Get all amounts
    console.log('\n3️⃣ Verificando todos los montos...\n');
    const amounts = await page.evaluate(() => {
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
          results.push(text);
        }
      }
      return results;
    });

    console.log('💰 Montos encontrados:');
    amounts.slice(0, 10).forEach((amount, i) => {
      console.log(`   ${i + 1}. ${amount}`);
    });
    
    if (amounts.length > 10) {
      console.log(`   ... y ${amounts.length - 10} más`);
    }

    // Take screenshot
    console.log('\n4️⃣ Tomando screenshot...');
    await page.screenshot({ path: 'reports-verification.png', fullPage: true });
    console.log('   Screenshot guardado: reports-verification.png');

    console.log('\n✅ Verificación completa. Revisa el navegador.');
    console.log('Presiona Ctrl+C cuando termines de revisar.');
    
    await page.waitForTimeout(300000); // 5 minutes

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

