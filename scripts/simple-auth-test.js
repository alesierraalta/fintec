const { chromium } = require('playwright');

async function testAuth() {
  console.log('🧪 Probando autenticación...');
  
  const browser = await chromium.launch({ 
    headless: false, // Para poder ver qué está pasando
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navegar a la página principal
    console.log('📍 Navegando a http://localhost:3000...');
    await page.goto('http://localhost:3000');
    
    // Ver qué página se carga
    const currentUrl = page.url();
    console.log('📍 URL actual:', currentUrl);
    
    // Si nos redirige a login, intentar crear usuario
    if (currentUrl.includes('/auth/login')) {
      console.log('🔐 Redirigido a login, intentando registro...');
      
      // Ir a registro
      await page.click('a[href="/auth/register"]');
      await page.waitForLoadState('networkidle');
      
      console.log('📍 URL de registro:', page.url());
      
      // Verificar si los campos están presentes
      const fullNameField = await page.locator('input[name="fullName"]').count();
      console.log('📝 Campos fullName encontrados:', fullNameField);
      
      if (fullNameField > 0) {
        // Llenar formulario
        await page.fill('input[name="fullName"]', 'Usuario Test');
        await page.fill('input[name="email"]', 'usuario.test@fintec.com');
        await page.fill('input[name="password"]', 'Test123!');
        await page.fill('input[name="confirmPassword"]', 'Test123!');
        
        console.log('📝 Formulario llenado, enviando...');
        
        // Enviar formulario
        await page.click('button[type="submit"]');
        
        // Esperar respuesta
        await page.waitForTimeout(5000);
        
        const finalUrl = page.url();
        console.log('📍 URL final:', finalUrl);
        
        // Verificar si hay errores en la página
        const errorElements = await page.locator('text=/error|Error|error/').count();
        console.log('❌ Elementos de error encontrados:', errorElements);
        
        if (errorElements > 0) {
          const errorText = await page.locator('text=/error|Error|error/').first().textContent();
          console.log('❌ Error:', errorText);
        }
        
        // Si estamos en dashboard, guardar sesión
        if (finalUrl === 'http://localhost:3000/' || finalUrl.includes('dashboard')) {
          console.log('✅ Registro exitoso!');
          await context.storageState({ path: 'playwright/.auth/user.json' });
          console.log('💾 Sesión guardada!');
        }
      }
    }
    
    // Esperar un poco para que el usuario pueda ver
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testAuth().catch(console.error);
