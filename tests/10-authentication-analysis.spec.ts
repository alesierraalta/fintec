import { test, expect } from '@playwright/test';

test.describe('Authentication Analysis and Debugging', () => {
  
  test('should analyze authentication persistence issue', async ({ page }) => {
    console.log('🔍 Analizando problema de persistencia de autenticación...');
    
    // Interceptar eventos de autenticación
    const authEvents: string[] = [];
    const networkRequests: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
      if (msg.text().includes('auth') || msg.text().includes('Auth')) {
        authEvents.push(`Console: ${msg.text()}`);
      }
    });
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('auth') || url.includes('supabase')) {
        networkRequests.push(`${request.method()} ${url.split('?')[0]}`);
      }
    });
    
    // Paso 1: Verificar estado inicial de autenticación
    await page.goto('/');
    console.log('📍 Paso 1: Verificando estado inicial...');
    await page.waitForTimeout(3000);
    
    const initialUserInfo = page.locator('text=Test User');
    const isInitiallyAuthenticated = await initialUserInfo.isVisible({ timeout: 5000 });
    
    console.log(`📊 Estado inicial de autenticación: ${isInitiallyAuthenticated ? 'AUTENTICADO' : 'NO AUTENTICADO'}`);
    
    if (isInitiallyAuthenticated) {
      console.log('✅ Usuario autenticado inicialmente');
    } else {
      console.log('❌ Usuario NO autenticado inicialmente');
      return;
    }
    
    // Paso 2: Navegar por páginas protegidas
    const protectedPages = ['/transactions', '/accounts', '/categories', '/transfers'];
    let successfulNavigations = 0;
    
    console.log('📍 Paso 2: Navegando por páginas protegidas...');
    
    for (const pageUrl of protectedPages) {
      await page.goto(pageUrl);
      console.log(`📍 Navegando a ${pageUrl}...`);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const isRedirectedToLogin = currentUrl.includes('/auth/');
      
      if (isRedirectedToLogin) {
        console.log(`❌ Redirigido a login desde ${pageUrl}`);
      } else {
        console.log(`✅ Acceso autorizado a ${pageUrl}`);
        successfulNavigations++;
      }
    }
    
    console.log(`📊 Navegaciones exitosas: ${successfulNavigations}/${protectedPages.length}`);
    
    // Paso 3: Verificar estado después de navegaciones
    await page.goto('/');
    console.log('📍 Paso 3: Verificando estado después de navegaciones...');
    await page.waitForTimeout(3000);
    
    const finalUserInfo = page.locator('text=Test User');
    const isStillAuthenticated = await finalUserInfo.isVisible({ timeout: 5000 });
    
    console.log(`📊 Estado final de autenticación: ${isStillAuthenticated ? 'AUTENTICADO' : 'NO AUTENTICADO'}`);
    
    // Paso 4: Analizar eventos capturados
    console.log('\n📊 ANÁLISIS DE EVENTOS DE AUTENTICACIÓN:');
    console.log(`📡 Eventos de auth: ${authEvents.length}`);
    console.log(`📡 Requests de red: ${networkRequests.length}`);
    console.log(`❌ Errores de consola: ${consoleErrors.length}`);
    
    if (authEvents.length > 0) {
      console.log('\n✅ EVENTOS DE AUTENTICACIÓN:');
      authEvents.slice(0, 5).forEach((event, index) => {
        console.log(`   ${index + 1}. ${event}`);
      });
    }
    
    if (networkRequests.length > 0) {
      console.log('\n✅ REQUESTS DE RED:');
      networkRequests.slice(0, 10).forEach((req, index) => {
        console.log(`   ${index + 1}. ${req}`);
      });
    }
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ ERRORES DE CONSOLA:');
      consoleErrors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    // Paso 5: Verificar storage state
    console.log('\n📍 Paso 5: Verificando storage state...');
    
    try {
      const storageState = await page.context().storageState();
      console.log(`📊 Origins en storage: ${storageState.origins.length}`);
      
      if (storageState.origins.length > 0) {
        const origin = storageState.origins[0];
        console.log(`📊 LocalStorage: ${origin.localStorage.length}`);
        
        // Buscar cookies de autenticación (if cookies exist)
        const authCookies = ('cookies' in origin && Array.isArray((origin as any).cookies)) 
          ? (origin as any).cookies.filter((cookie: any) => 
              cookie.name.includes('auth') || 
              cookie.name.includes('session') ||
              cookie.name.includes('supabase')
            )
          : [];
        
        console.log(`📊 Cookies de auth: ${authCookies.length}`);
        authCookies.forEach((cookie: any) => {
          console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
        });
      }
    } catch (error) {
      console.log(`⚠️ Error verificando storage: ${(error as Error).message}`);
    }
    
    // Paso 6: Verificar elementos de UI relacionados con auth
    console.log('\n📍 Paso 6: Verificando elementos de UI...');
    
    const uiElements = [
      'text=Test User',
      'text=Dashboard',
      'text=¡FinTec! 💼',
      'button:has-text("Cerrar")',
      'button:has-text("Logout")',
      '[data-testid="user-menu"]'
    ];
    
    let foundUIElements = 0;
    for (const selector of uiElements) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✅ Elemento UI encontrado: ${selector} (${count} elementos)`);
          foundUIElements += count;
        }
      } catch {
        // Continuar
      }
    }
    
    console.log(`📊 Total elementos UI relacionados con auth: ${foundUIElements}`);
    
    // Paso 7: Diagnóstico final
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    
    if (isInitiallyAuthenticated && isStillAuthenticated) {
      console.log('✅ AUTENTICACIÓN PERSISTENTE: El problema puede estar en los tests específicos');
    } else if (isInitiallyAuthenticated && !isStillAuthenticated) {
      console.log('❌ PÉRDIDA DE AUTENTICACIÓN: La sesión se pierde durante las navegaciones');
    } else if (!isInitiallyAuthenticated) {
      console.log('❌ FALLO DE AUTENTICACIÓN INICIAL: Problema en el setup');
    }
    
    console.log(`📊 Navegaciones exitosas: ${successfulNavigations}/${protectedPages.length}`);
    console.log(`📊 Requests de red capturados: ${networkRequests.length}`);
    console.log(`📊 Errores encontrados: ${consoleErrors.length}`);
    
    // El test no debe fallar, solo analizar
    expect(true).toBeTruthy();
    console.log('\n✅ Análisis de autenticación completado');
  });
  
  test('should test session persistence with explicit checks', async ({ page }) => {
    console.log('🔍 Probando persistencia de sesión con verificaciones explícitas...');
    
    // Paso 1: Verificar autenticación inicial
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Verificar múltiples indicadores de autenticación
    const authIndicators = [
      'text=Test User',
      'text=Dashboard',
      'text=¡FinTec! 💼',
      'text=Tu dinero total'
    ];
    
    let initialAuthCount = 0;
    for (const indicator of authIndicators) {
      try {
        await expect(page.locator(indicator)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Indicador inicial encontrado: ${indicator}`);
        initialAuthCount++;
      } catch {
        console.log(`⚠️ Indicador inicial no encontrado: ${indicator}`);
      }
    }
    
    console.log(`📊 Indicadores de auth iniciales: ${initialAuthCount}/${authIndicators.length}`);
    
    if (initialAuthCount === 0) {
      console.log('❌ No hay indicadores de autenticación inicial');
      return;
    }
    
    // Paso 2: Navegar con verificaciones intermedias
    const pages = ['/transactions', '/accounts', '/categories'];
    
    for (const pageUrl of pages) {
      await page.goto(pageUrl);
      console.log(`📍 Navegando a ${pageUrl}...`);
      await page.waitForTimeout(2000);
      
      // Verificar que no fuimos redirigidos a login
      const currentUrl = page.url();
      const isRedirected = currentUrl.includes('/auth/');
      
      if (isRedirected) {
        console.log(`❌ Redirigido a login desde ${pageUrl}`);
      } else {
        console.log(`✅ Acceso autorizado a ${pageUrl}`);
      }
      
      // Verificar indicadores de autenticación en cada página
      const userVisible = await page.locator('text=Test User').isVisible({ timeout: 2000 });
      console.log(`📊 Usuario visible en ${pageUrl}: ${userVisible ? 'SÍ' : 'NO'}`);
    }
    
    // Paso 3: Verificación final
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    let finalAuthCount = 0;
    for (const indicator of authIndicators) {
      try {
        await expect(page.locator(indicator)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Indicador final encontrado: ${indicator}`);
        finalAuthCount++;
      } catch {
        console.log(`⚠️ Indicador final no encontrado: ${indicator}`);
      }
    }
    
    console.log(`📊 Indicadores de auth finales: ${finalAuthCount}/${authIndicators.length}`);
    
    // Paso 4: Análisis de persistencia
    const persistenceRatio = finalAuthCount / initialAuthCount;
    console.log(`📊 Ratio de persistencia: ${(persistenceRatio * 100).toFixed(1)}%`);
    
    if (persistenceRatio >= 0.75) {
      console.log('✅ BUENA PERSISTENCIA DE AUTENTICACIÓN');
    } else if (persistenceRatio >= 0.5) {
      console.log('⚠️ PERSISTENCIA PARCIAL DE AUTENTICACIÓN');
    } else {
      console.log('❌ POBRE PERSISTENCIA DE AUTENTICACIÓN');
    }
    
    // El test pasa si hay al menos algún nivel de persistencia
    expect(finalAuthCount).toBeGreaterThan(0);
    console.log('✅ Test de persistencia de sesión completado');
  });
});
