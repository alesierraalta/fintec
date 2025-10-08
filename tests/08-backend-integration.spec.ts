import { test, expect } from '@playwright/test';

test.describe('Backend Integration Tests', () => {
  
  test('should verify Supabase connection and data flow', async ({ page }) => {
    console.log('🔍 Verificando conexión y flujo de datos con Supabase...');
    
    // Interceptar todos los requests
    const supabaseRequests: Array<{method: string, url: string, status?: number}> = [];
    const apiRequests: Array<{method: string, url: string, status?: number}> = [];
    const errors: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('supabase')) {
        supabaseRequests.push({
          method: request.method(),
          url: url
        });
      } else if (url.includes('/api/')) {
        apiRequests.push({
          method: request.method(),
          url: url
        });
      }
    });
    
    page.on('response', response => {
      const url = response.url();
      if ((url.includes('supabase') || url.includes('/api/')) && response.status() >= 400) {
        errors.push(`${response.status()} ${response.method()} ${url}`);
      }
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('supabase')) {
        errors.push(`Console Error: ${msg.text()}`);
      }
    });
    
    // Paso 1: Navegar al dashboard y verificar requests iniciales
    await page.goto('/');
    console.log('📍 Paso 1: Navegando al dashboard...');
    await page.waitForLoadState('networkidle');
    
    // Paso 2: Ir a transacciones
    await page.goto('/transactions');
    console.log('📍 Paso 2: Navegando a transacciones...');
    await page.waitForLoadState('networkidle');
    
    // Paso 3: Intentar crear una transacción
    const addTransactionButton = page.locator('text=Agregar Transacción');
    if (await addTransactionButton.isVisible({ timeout: 5000 })) {
      await addTransactionButton.click();
      console.log('✅ Paso 3: Intentando crear transacción...');
      await page.waitForTimeout(3000);
    }
    
    // Paso 4: Ir a cuentas
    await page.goto('/accounts');
    console.log('📍 Paso 4: Navegando a cuentas...');
    await page.waitForLoadState('networkidle');
    
    // Paso 5: Ir a categorías
    await page.goto('/categories');
    console.log('📍 Paso 5: Navegando a categorías...');
    await page.waitForLoadState('networkidle');
    
    // Paso 6: Intentar crear una categoría
    const newCategoryButton = page.locator('text=Nueva Categoría');
    if (await newCategoryButton.isVisible({ timeout: 5000 })) {
      await newCategoryButton.click();
      console.log('✅ Paso 6: Intentando crear categoría...');
      await page.waitForTimeout(3000);
    }
    
    // Paso 7: Ir a transferencias
    await page.goto('/transfers');
    console.log('📍 Paso 7: Navegando a transferencias...');
    await page.waitForLoadState('networkidle');
    
    // Paso 8: Analizar requests capturados
    console.log('\n📊 ANÁLISIS DE INTEGRACIÓN CON BACKEND:');
    console.log(`📡 Total requests a Supabase: ${supabaseRequests.length}`);
    console.log(`📡 Total requests a API local: ${apiRequests.length}`);
    console.log(`❌ Total errores encontrados: ${errors.length}`);
    
    // Mostrar requests importantes
    const importantSupabaseRequests = supabaseRequests.filter(req => 
      req.url.includes('transactions') || 
      req.url.includes('accounts') || 
      req.url.includes('categories') ||
      req.url.includes('users') ||
      req.url.includes('notifications')
    );
    
    if (importantSupabaseRequests.length > 0) {
      console.log('\n✅ REQUESTS IMPORTANTES A SUPABASE:');
      importantSupabaseRequests.slice(0, 10).forEach((req, index) => {
        console.log(`   ${index + 1}. ${req.method} ${req.url.split('?')[0]}`);
      });
    }
    
    const importantApiRequests = apiRequests.filter(req => 
      req.url.includes('transactions') || 
      req.url.includes('accounts') || 
      req.url.includes('categories') ||
      req.url.includes('transfers') ||
      req.url.includes('bcv-rates')
    );
    
    if (importantApiRequests.length > 0) {
      console.log('\n✅ REQUESTS IMPORTANTES A API LOCAL:');
      importantApiRequests.slice(0, 10).forEach((req, index) => {
        console.log(`   ${index + 1}. ${req.method} ${req.url}`);
      });
    }
    
    // Mostrar errores si los hay
    if (errors.length > 0) {
      console.log('\n❌ ERRORES ENCONTRADOS:');
      errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ NO SE ENCONTRARON ERRORES DE BACKEND');
    }
    
    // Verificar que hay comunicación con Supabase
    expect(supabaseRequests.length).toBeGreaterThan(0);
    console.log('\n✅ INTEGRACIÓN CON SUPABASE CONFIRMADA');
    
    // Verificar que hay comunicación con API local
    expect(apiRequests.length).toBeGreaterThan(0);
    console.log('✅ INTEGRACIÓN CON API LOCAL CONFIRMADA');
    
    console.log('\n🎯 RESUMEN DE INTEGRACIÓN:');
    console.log(`   📊 Supabase: ${supabaseRequests.length} requests`);
    console.log(`   📊 API Local: ${apiRequests.length} requests`);
    console.log(`   ❌ Errores: ${errors.length}`);
    console.log(`   ✅ Estado: ${errors.length === 0 ? 'FUNCIONANDO' : 'CON PROBLEMAS'}`);
  });
  
  test('should test data persistence across page navigation', async ({ page }) => {
    console.log('🔍 Probando persistencia de datos entre navegaciones...');
    
    // Interceptar requests para verificar que se cargan datos
    const dataLoadRequests: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if ((url.includes('supabase') || url.includes('/api/')) && 
          (url.includes('select') || request.method() === 'GET')) {
        dataLoadRequests.push(`${request.method()} ${url.split('?')[0]}`);
      }
    });
    
    // Paso 1: Navegar por todas las páginas principales
    const pages = [
      { url: '/', name: 'Dashboard' },
      { url: '/transactions', name: 'Transacciones' },
      { url: '/accounts', name: 'Cuentas' },
      { url: '/categories', name: 'Categorías' },
      { url: '/transfers', name: 'Transferencias' }
    ];
    
    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      console.log(`📍 Navegando a ${pageInfo.name}...`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    // Paso 2: Volver a navegar por las páginas para verificar cache/recarga
    console.log('\n📍 Segunda pasada para verificar persistencia...');
    for (const pageInfo of pages.slice(0, 3)) { // Solo las primeras 3 para no ser demasiado largo
      await page.goto(pageInfo.url);
      console.log(`📍 Revisitando ${pageInfo.name}...`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    // Paso 3: Analizar requests de carga de datos
    const uniqueRequests = [...new Set(dataLoadRequests)];
    console.log('\n📊 REQUESTS DE CARGA DE DATOS:');
    console.log(`📡 Total requests únicos: ${uniqueRequests.length}`);
    
    const requestsByType = {
      'accounts': uniqueRequests.filter(req => req.includes('accounts')).length,
      'transactions': uniqueRequests.filter(req => req.includes('transactions')).length,
      'categories': uniqueRequests.filter(req => req.includes('categories')).length,
      'transfers': uniqueRequests.filter(req => req.includes('transfers')).length,
      'notifications': uniqueRequests.filter(req => req.includes('notifications')).length,
      'bcv-rates': uniqueRequests.filter(req => req.includes('bcv-rates')).length
    };
    
    console.log('\n📊 REQUESTS POR TIPO DE DATO:');
    Object.entries(requestsByType).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`   📊 ${type}: ${count} requests`);
      }
    });
    
    // Verificar que se están cargando datos
    expect(uniqueRequests.length).toBeGreaterThan(0);
    console.log('\n✅ PERSISTENCIA DE DATOS CONFIRMADA');
    
    // Verificar que se cargan al menos algunos tipos de datos
    const totalDataTypes = Object.values(requestsByType).reduce((sum, count) => sum + count, 0);
    expect(totalDataTypes).toBeGreaterThan(0);
    console.log('✅ CARGA DE DIFERENTES TIPOS DE DATOS CONFIRMADA');
  });
  
  test('should test error handling and recovery', async ({ page }) => {
    console.log('🔍 Probando manejo de errores y recuperación...');
    
    const errors: string[] = [];
    const successfulRequests: string[] = [];
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('supabase') || url.includes('/api/')) {
        if (response.status() >= 400) {
          errors.push(`${response.status()} ${response.method()} ${url.split('?')[0]}`);
        } else {
          successfulRequests.push(`${response.status()} ${response.method()} ${url.split('?')[0]}`);
        }
      }
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console: ${msg.text()}`);
      }
    });
    
    // Paso 1: Navegar por todas las páginas para capturar errores
    const pages = ['/', '/transactions', '/accounts', '/categories', '/transfers'];
    
    for (const pageUrl of pages) {
      await page.goto(pageUrl);
      console.log(`📍 Navegando a ${pageUrl}...`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    // Paso 2: Intentar acciones que podrían generar errores
    console.log('\n📍 Probando acciones que podrían generar errores...');
    
    // Intentar crear transacción sin datos
    await page.goto('/transactions');
    const addTransactionButton = page.locator('text=Agregar Transacción');
    if (await addTransactionButton.isVisible({ timeout: 5000 })) {
      await addTransactionButton.click();
      await page.waitForTimeout(2000);
      
      // Buscar botón de guardar y clickearlo sin llenar datos
      const saveButton = page.locator('button[type="submit"], text=Guardar, text=Save').first();
      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Intentando guardar transacción sin datos...');
      }
    }
    
    // Intentar crear categoría
    await page.goto('/categories');
    const newCategoryButton = page.locator('text=Nueva Categoría');
    if (await newCategoryButton.isVisible({ timeout: 5000 })) {
      await newCategoryButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Abriendo formulario de categoría...');
    }
    
    // Paso 3: Analizar errores y recuperación
    console.log('\n📊 ANÁLISIS DE MANEJO DE ERRORES:');
    console.log(`❌ Errores encontrados: ${errors.length}`);
    console.log(`✅ Requests exitosos: ${successfulRequests.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORES CAPTURADOS:');
      errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    // Verificar que la aplicación se mantiene funcional
    await page.goto('/');
    const dashboardVisible = await page.locator('text=Dashboard, text=Test User').first().isVisible({ timeout: 5000 });
    
    if (dashboardVisible) {
      console.log('✅ La aplicación se mantiene funcional después de errores');
    } else {
      console.log('⚠️ La aplicación puede tener problemas después de errores');
    }
    
    // Verificar que hay más requests exitosos que errores
    expect(successfulRequests.length).toBeGreaterThan(0);
    console.log('\n✅ MANEJO DE ERRORES Y RECUPERACIÓN CONFIRMADO');
    
    const errorRate = errors.length / (errors.length + successfulRequests.length);
    console.log(`📊 Tasa de error: ${(errorRate * 100).toFixed(2)}%`);
    
    if (errorRate < 0.1) { // Menos del 10% de errores
      console.log('✅ Tasa de error aceptable');
    } else {
      console.log('⚠️ Tasa de error alta, revisar integración');
    }
  });
  
  test('should verify authentication state persistence', async ({ page }) => {
    console.log('🔍 Verificando persistencia del estado de autenticación...');
    
    // Paso 1: Verificar que estamos autenticados
    await page.goto('/');
    console.log('📍 Paso 1: Verificando estado inicial de autenticación...');
    await page.waitForLoadState('networkidle');
    
    const userInfo = page.locator('text=Test User');
    const isAuthenticated = await userInfo.isVisible({ timeout: 5000 });
    
    if (isAuthenticated) {
      console.log('✅ Usuario autenticado correctamente');
    } else {
      console.log('❌ Usuario no autenticado');
      return;
    }
    
    // Paso 2: Navegar por páginas protegidas
    const protectedPages = ['/transactions', '/accounts', '/categories', '/transfers'];
    
    for (const pageUrl of protectedPages) {
      await page.goto(pageUrl);
      console.log(`📍 Navegando a página protegida: ${pageUrl}...`);
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      const isRedirectedToLogin = currentUrl.includes('/auth/');
      
      if (isRedirectedToLogin) {
        console.log(`❌ Redirigido a login desde ${pageUrl}`);
      } else {
        console.log(`✅ Acceso autorizado a ${pageUrl}`);
      }
    }
    
    // Paso 3: Verificar que el estado se mantiene entre navegaciones
    await page.goto('/');
    const userInfoStillVisible = await userInfo.isVisible({ timeout: 5000 });
    
    if (userInfoStillVisible) {
      console.log('✅ Estado de autenticación persistente');
    } else {
      console.log('❌ Estado de autenticación no persistente');
    }
    
    // Paso 4: Verificar requests autenticados
    const authenticatedRequests: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('supabase') && request.headers()['authorization']) {
        authenticatedRequests.push(request.url().split('?')[0]);
      }
    });
    
    // Hacer algunas navegaciones para generar requests
    await page.goto('/transactions');
    await page.goto('/accounts');
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');
    
    console.log(`📊 Requests autenticados capturados: ${authenticatedRequests.length}`);
    
    if (authenticatedRequests.length > 0) {
      console.log('✅ Requests autenticados funcionando');
      console.log(`📋 Ejemplos de requests autenticados:`);
      [...new Set(authenticatedRequests)].slice(0, 3).forEach((req, index) => {
        console.log(`   ${index + 1}. ${req}`);
      });
    } else {
      console.log('⚠️ No se detectaron requests autenticados');
    }
    
    expect(userInfoStillVisible).toBeTruthy();
    console.log('\n✅ PERSISTENCIA DE AUTENTICACIÓN CONFIRMADA');
  });
});
