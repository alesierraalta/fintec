const { chromium } = require('playwright');

async function diagnoseAuth() {
  console.log('🔍 Diagnosticando problema de autenticación...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 1. Verificar conexión a Supabase
    console.log('1️⃣ Verificando conexión a Supabase...');
    
    await page.goto('http://localhost:3000/auth/register');
    await page.waitForLoadState('networkidle');
    
    // Interceptar requests a Supabase
    const supabaseRequests = [];
    page.on('request', request => {
      if (request.url().includes('supabase.co')) {
        supabaseRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('supabase.co')) {
        console.log(`📡 Supabase Request: ${response.request().method()} ${response.url()}`);
        console.log(`   Status: ${response.status()}`);
      }
    });
    
    // 2. Intentar registro y capturar errores
    console.log('2️⃣ Intentando registro...');
    
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', 'test@fintec.com');
    await page.fill('input[name="password"]', 'Test123!');
    await page.fill('input[name="confirmPassword"]', 'Test123!');
    
    console.log('🔘 Enviando formulario...');
    await page.click('button[type="submit"]');
    
    // Esperar respuesta
    await page.waitForTimeout(5000);
    
    // 3. Verificar errores en la página
    console.log('3️⃣ Verificando errores...');
    
    const currentUrl = page.url();
    console.log('📍 URL actual:', currentUrl);
    
    // Buscar mensajes de error
    const errorSelectors = [
      '[class*="error"]',
      '[class*="Error"]',
      '.text-red-500',
      '.bg-red-50',
      '[role="alert"]',
      '.alert',
      '.error-message'
    ];
    
    for (const selector of errorSelectors) {
      const elements = await page.locator(selector).all();
      for (let i = 0; i < elements.length; i++) {
        const text = await elements[i].textContent();
        if (text && text.trim()) {
          console.log(`❌ Error encontrado (${selector}): ${text.trim()}`);
        }
      }
    }
    
    // 4. Verificar consola del navegador
    console.log('4️⃣ Verificando consola del navegador...');
    
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
        console.log(`🚨 Error en consola: ${msg.text()}`);
      }
    });
    
    // 5. Verificar si hay confirmación de email requerida
    console.log('5️⃣ Verificando si se requiere confirmación de email...');
    
    const pageContent = await page.content();
    if (pageContent.includes('confirmation') || pageContent.includes('verification') || pageContent.includes('check your email')) {
      console.log('📧 Se requiere confirmación de email');
    }
    
    // 6. Intentar login si el registro falló
    if (currentUrl.includes('/auth/register')) {
      console.log('6️⃣ Registro falló, intentando login...');
      
      await page.goto('http://localhost:3000/auth/login');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[name="email"]', 'test@fintec.com');
      await page.fill('input[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(3000);
      
      const loginUrl = page.url();
      console.log('📍 URL después del login:', loginUrl);
      
      if (loginUrl.includes('/auth/')) {
        console.log('❌ Login también falló');
        
        // Buscar errores de login
        for (const selector of errorSelectors) {
          const elements = await page.locator(selector).all();
          for (let i = 0; i < elements.length; i++) {
            const text = await elements[i].textContent();
            if (text && text.trim()) {
              console.log(`❌ Error de login (${selector}): ${text.trim()}`);
            }
          }
        }
      } else {
        console.log('✅ Login exitoso!');
      }
    }
    
    // 7. Verificar requests a Supabase
    console.log('7️⃣ Requests a Supabase capturados:', supabaseRequests.length);
    supabaseRequests.forEach((req, index) => {
      console.log(`   ${index + 1}. ${req.method} ${req.url}`);
    });
    
    // 8. Tomar screenshot final
    await page.screenshot({ path: 'diagnose-auth-final.png', fullPage: true });
    console.log('📸 Screenshot guardado como diagnose-auth-final.png');
    
  } catch (error) {
    console.error('❌ Error durante diagnóstico:', error.message);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

diagnoseAuth().catch(console.error);
