import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('🚀 Iniciando setup de autenticación automática...');
  
  // Configurar timeout más largo
  page.setDefaultTimeout(60000);
  
  try {
    // Ir directamente a login con el usuario existente
    console.log('📍 Navegando a /auth/login...');
    await page.goto('/auth/login', { waitUntil: 'networkidle' });
    
    // Verificar que estamos en login
    if (!page.url().includes('/auth/login')) {
      throw new Error('No se pudo navegar a la página de login');
    }
    
    // Esperar formulario
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    console.log('✅ Formulario de login encontrado');
    
    // Usar el usuario que ya existe y está configurado
    const existingUser = {
      email: 'test@fintec.com',
      password: 'Test123!'
    };
    
    // Llenar formulario
    console.log('📝 Llenando formulario de login...');
    await page.fill('input[name="email"]', existingUser.email);
    await page.fill('input[name="password"]', existingUser.password);
    
    // Enviar formulario
    console.log('🔘 Enviando formulario...');
    await page.click('button[type="submit"]');
    
    // Esperar respuesta
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log('📍 URL después del login:', currentUrl);
    
    // Verificar si hay errores
    const errorElements = await page.locator('[class*="error"], [class*="Error"], .text-red-500, .bg-red-50').all();
    for (let i = 0; i < errorElements.length; i++) {
      const text = await errorElements[i].textContent();
      if (text && text.trim()) {
        console.log(`❌ Error encontrado: ${text.trim()}`);
      }
    }
    
    // Verificar si estamos autenticados
    if (currentUrl.includes('/auth/')) {
      console.log('❌ Login falló, aún en página de auth');
      throw new Error('No se pudo autenticar con el usuario existente');
    } else {
      console.log('✅ Login exitoso!');
    }
    
    // Verificar indicadores de autenticación
    console.log('🔍 Verificando autenticación...');
    
    // Buscar elementos que indiquen que estamos autenticados
    const authIndicators = [
      '[data-testid="user-menu"]',
      'button:has-text("Cerrar")',
      'button:has-text("Logout")',
      'text=Dashboard',
      '.dashboard'
    ];
    
    let authenticated = false;
    for (const indicator of authIndicators) {
      try {
        await expect(page.locator(indicator)).toBeVisible({ timeout: 3000 });
        authenticated = true;
        console.log(`✅ Indicador de autenticación encontrado: ${indicator}`);
        break;
      } catch {
        // Continuar con el siguiente indicador
      }
    }
    
    if (!authenticated) {
      console.log('⚠️ No se encontraron indicadores específicos, pero la URL sugiere autenticación exitosa');
    }
    
    // Guardar estado de autenticación
    console.log('💾 Guardando estado de autenticación...');
    await page.context().storageState({ path: authFile });
    
    console.log('🎉 Setup de autenticación completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en setup de autenticación:', error instanceof Error ? error.message : String(error));
    
    // Intentar guardar el estado actual de todas formas
    try {
      await page.context().storageState({ path: authFile });
      console.log('💾 Estado parcial guardado');
    } catch (saveError) {
      console.error('❌ No se pudo guardar el estado:', saveError instanceof Error ? saveError.message : String(saveError));
    }
    
    throw error;
  }
});
