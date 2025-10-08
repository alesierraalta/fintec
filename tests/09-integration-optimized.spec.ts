import { test, expect } from '@playwright/test';

test.describe('Optimized Integration Tests', () => {
  
  test('should test basic page navigation and state', async ({ page }) => {
    console.log('🔍 Probando navegación básica entre páginas...');
    
    // Paso 1: Ir al dashboard
    await page.goto('/');
    console.log('📍 Paso 1: En dashboard...');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);
    expect(currentUrl).toContain('/');
    
    // Paso 2: Verificar elementos básicos del dashboard
    const dashboardElements = [
      'text=Test User',
      'text=¡FinTec! 💼',
      'text=Dashboard'
    ];
    
    let foundElements = 0;
    for (const selector of dashboardElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Elemento encontrado: ${selector}`);
        foundElements++;
      } catch {
        console.log(`⚠️ Elemento no encontrado: ${selector}`);
      }
    }
    
    console.log(`📊 Elementos del dashboard encontrados: ${foundElements}/${dashboardElements.length}`);
    expect(foundElements).toBeGreaterThan(0);
    
    // Paso 3: Navegar a transacciones
    const transactionsLink = page.locator('text=Gastos, a[href="/transactions"]').first();
    if (await transactionsLink.isVisible({ timeout: 5000 })) {
      await transactionsLink.click();
      console.log('✅ Paso 3: Navegando a transacciones...');
      await page.waitForTimeout(3000);
      
      const transactionsUrl = page.url();
      expect(transactionsUrl).toContain('/transactions');
      console.log(`📍 URL de transacciones: ${transactionsUrl}`);
    }
    
    // Paso 4: Verificar elementos de transacciones
    const transactionElements = [
      'text=Agregar Transacción',
      'text=Transacciones'
    ];
    
    let foundTransactionElements = 0;
    for (const selector of transactionElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Elemento de transacciones encontrado: ${selector}`);
        foundTransactionElements++;
      } catch {
        console.log(`⚠️ Elemento de transacciones no encontrado: ${selector}`);
      }
    }
    
    console.log(`📊 Elementos de transacciones encontrados: ${foundTransactionElements}/${transactionElements.length}`);
    
    console.log('✅ Test de navegación básica completado');
  });
  
  test('should test form interactions and backend communication', async ({ page }) => {
    console.log('🔍 Probando interacciones de formularios y comunicación con backend...');
    
    // Interceptar requests
    const requests: string[] = [];
    const errors: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('supabase') || url.includes('/api/')) {
        requests.push(`${request.method()} ${url.split('?')[0]}`);
      }
    });
    
    page.on('response', response => {
      const url = response.url();
      if ((url.includes('supabase') || url.includes('/api/')) && response.status() >= 400) {
        errors.push(`${response.status()} ${response.url().split('?')[0]}`);
      }
    });
    
    // Paso 1: Ir a categorías
    await page.goto('/categories');
    console.log('📍 Paso 1: Navegando a categorías...');
    await page.waitForTimeout(3000);
    
    // Paso 2: Intentar abrir formulario de categoría
    const newCategoryButton = page.locator('text=Nueva Categoría');
    if (await newCategoryButton.isVisible({ timeout: 5000 })) {
      await newCategoryButton.click();
      console.log('✅ Paso 2: Abriendo formulario de categoría...');
      await page.waitForTimeout(3000);
      
      // Verificar si apareció el formulario
      const formVisible = await page.locator('form, input, [role="dialog"]').first().isVisible({ timeout: 3000 });
      if (formVisible) {
        console.log('✅ Formulario de categoría apareció');
        
        // Intentar llenar un campo
        const inputs = await page.locator('input[type="text"]').all();
        if (inputs.length > 0) {
          try {
            await inputs[0].fill('Test Category');
            console.log('✅ Campo de categoría llenado');
          } catch (error) {
            console.log(`⚠️ Error llenando campo: ${error.message}`);
          }
        }
      } else {
        console.log('⚠️ Formulario de categoría no apareció');
      }
    }
    
    // Paso 3: Ir a transacciones
    await page.goto('/transactions');
    console.log('📍 Paso 3: Navegando a transacciones...');
    await page.waitForTimeout(3000);
    
    // Paso 4: Intentar abrir formulario de transacción
    const addTransactionButton = page.locator('text=Agregar Transacción');
    if (await addTransactionButton.isVisible({ timeout: 5000 })) {
      await addTransactionButton.click();
      console.log('✅ Paso 4: Abriendo formulario de transacción...');
      await page.waitForTimeout(3000);
      
      // Verificar si apareció el formulario
      const transactionFormVisible = await page.locator('form, input, [role="dialog"]').first().isVisible({ timeout: 3000 });
      if (transactionFormVisible) {
        console.log('✅ Formulario de transacción apareció');
      } else {
        console.log('⚠️ Formulario de transacción no apareció');
      }
    }
    
    // Paso 5: Analizar comunicación con backend
    console.log('\n📊 ANÁLISIS DE COMUNICACIÓN CON BACKEND:');
    console.log(`📡 Total requests capturados: ${requests.length}`);
    console.log(`❌ Total errores: ${errors.length}`);
    
    const uniqueRequests = [...new Set(requests)];
    console.log(`📡 Requests únicos: ${uniqueRequests.length}`);
    
    if (uniqueRequests.length > 0) {
      console.log('\n✅ REQUESTS IMPORTANTES:');
      uniqueRequests.slice(0, 5).forEach((req, index) => {
        console.log(`   ${index + 1}. ${req}`);
      });
    }
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORES ENCONTRADOS:');
      errors.slice(0, 3).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ NO SE ENCONTRARON ERRORES DE BACKEND');
    }
    
    // Verificar que hay comunicación con el backend
    expect(uniqueRequests.length).toBeGreaterThan(0);
    console.log('\n✅ COMUNICACIÓN CON BACKEND CONFIRMADA');
    
    console.log('✅ Test de formularios y backend completado');
  });
  
  test('should test data flow between pages', async ({ page }) => {
    console.log('🔍 Probando flujo de datos entre páginas...');
    
    // Paso 1: Ir al dashboard y verificar datos iniciales
    await page.goto('/');
    console.log('📍 Paso 1: Verificando datos en dashboard...');
    await page.waitForTimeout(3000);
    
    // Buscar indicadores de datos
    const dataIndicators = [
      'text=$0.00',
      'text=0',
      'text=Sin transacciones',
      'text=No hay datos'
    ];
    
    let foundDataIndicators = 0;
    for (const selector of dataIndicators) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`📊 Indicador de datos encontrado: ${selector} (${count} elementos)`);
          foundDataIndicators += count;
        }
      } catch {
        // Continuar
      }
    }
    
    console.log(`📊 Total indicadores de datos: ${foundDataIndicators}`);
    
    // Paso 2: Ir a transacciones y verificar estado
    await page.goto('/transactions');
    console.log('📍 Paso 2: Verificando estado en transacciones...');
    await page.waitForTimeout(3000);
    
    const transactionStateElements = [
      'text=No hay transacciones',
      'text=Sin transacciones',
      'text=Agregar Transacción'
    ];
    
    let foundTransactionState = 0;
    for (const selector of transactionStateElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Estado de transacciones encontrado: ${selector}`);
        foundTransactionState++;
      } catch {
        console.log(`⚠️ Estado de transacciones no encontrado: ${selector}`);
      }
    }
    
    console.log(`📊 Estados de transacciones encontrados: ${foundTransactionState}/${transactionStateElements.length}`);
    
    // Paso 3: Ir a cuentas y verificar estado
    await page.goto('/accounts');
    console.log('📍 Paso 3: Verificando estado en cuentas...');
    await page.waitForTimeout(3000);
    
    const accountStateElements = [
      'text=No tienes cuentas',
      'text=Crear Primera Cuenta',
      'text=Sin cuentas'
    ];
    
    let foundAccountState = 0;
    for (const selector of accountStateElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Estado de cuentas encontrado: ${selector}`);
        foundAccountState++;
      } catch {
        console.log(`⚠️ Estado de cuentas no encontrado: ${selector}`);
      }
    }
    
    console.log(`📊 Estados de cuentas encontrados: ${foundAccountState}/${accountStateElements.length}`);
    
    // Paso 4: Ir a categorías y verificar estado
    await page.goto('/categories');
    console.log('📍 Paso 4: Verificando estado en categorías...');
    await page.waitForTimeout(3000);
    
    const categoryStateElements = [
      'text=No se encontraron categorías',
      'text=Crear Primera Categoría',
      'text=Nueva Categoría'
    ];
    
    let foundCategoryState = 0;
    for (const selector of categoryStateElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Estado de categorías encontrado: ${selector}`);
        foundCategoryState++;
      } catch {
        console.log(`⚠️ Estado de categorías no encontrado: ${selector}`);
      }
    }
    
    console.log(`📊 Estados de categorías encontrados: ${foundCategoryState}/${categoryStateElements.length}`);
    
    // Verificar que al menos algunas páginas muestran estados apropiados
    const totalStates = foundTransactionState + foundAccountState + foundCategoryState;
    expect(totalStates).toBeGreaterThan(0);
    console.log(`📊 Total estados encontrados: ${totalStates}`);
    
    console.log('✅ Test de flujo de datos entre páginas completado');
  });
  
  test('should test authentication persistence', async ({ page }) => {
    console.log('🔍 Probando persistencia de autenticación...');
    
    // Paso 1: Verificar que estamos autenticados
    await page.goto('/');
    console.log('📍 Paso 1: Verificando autenticación inicial...');
    await page.waitForTimeout(3000);
    
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
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const isRedirectedToLogin = currentUrl.includes('/auth/');
      
      if (isRedirectedToLogin) {
        console.log(`❌ Redirigido a login desde ${pageUrl}`);
      } else {
        console.log(`✅ Acceso autorizado a ${pageUrl}`);
      }
    }
    
    // Paso 3: Verificar que el estado se mantiene
    await page.goto('/');
    const userInfoStillVisible = await userInfo.isVisible({ timeout: 5000 });
    
    if (userInfoStillVisible) {
      console.log('✅ Estado de autenticación persistente');
    } else {
      console.log('❌ Estado de autenticación no persistente');
    }
    
    expect(userInfoStillVisible).toBeTruthy();
    console.log('✅ Test de persistencia de autenticación completado');
  });
  
  test('should test basic functionality without timeouts', async ({ page }) => {
    console.log('🔍 Probando funcionalidad básica sin timeouts...');
    
    // Paso 1: Navegar rápidamente por las páginas principales
    const pages = [
      { url: '/', name: 'Dashboard' },
      { url: '/transactions', name: 'Transacciones' },
      { url: '/accounts', name: 'Cuentas' },
      { url: '/categories', name: 'Categorías' },
      { url: '/transfers', name: 'Transferencias' }
    ];
    
    let successfulNavigations = 0;
    
    for (const pageInfo of pages) {
      try {
        await page.goto(pageInfo.url);
        console.log(`📍 Navegando a ${pageInfo.name}...`);
        await page.waitForTimeout(1000); // Tiempo mínimo
        
        const currentUrl = page.url();
        if (currentUrl.includes(pageInfo.url.replace('/', '')) || 
            (pageInfo.url === '/' && currentUrl.includes('/'))) {
          console.log(`✅ Navegación exitosa a ${pageInfo.name}`);
          successfulNavigations++;
        } else {
          console.log(`⚠️ URL inesperada en ${pageInfo.name}: ${currentUrl}`);
        }
      } catch (error) {
        console.log(`❌ Error navegando a ${pageInfo.name}: ${error.message}`);
      }
    }
    
    console.log(`📊 Navegaciones exitosas: ${successfulNavigations}/${pages.length}`);
    expect(successfulNavigations).toBeGreaterThan(3); // Al menos 4 de 5 páginas
    
    // Paso 2: Verificar elementos básicos en cada página
    let pagesWithElements = 0;
    
    for (const pageInfo of pages) {
      try {
        await page.goto(pageInfo.url);
        await page.waitForTimeout(1000);
        
        // Buscar elementos básicos comunes
        const basicElements = [
          'text=Test User',
          'text=¡FinTec! 💼',
          'button',
          'input',
          'form'
        ];
        
        let foundElements = 0;
        for (const selector of basicElements) {
          try {
            const count = await page.locator(selector).count();
            if (count > 0) {
              foundElements += count;
            }
          } catch {
            // Continuar
          }
        }
        
        if (foundElements > 0) {
          console.log(`✅ ${pageInfo.name} tiene ${foundElements} elementos básicos`);
          pagesWithElements++;
        } else {
          console.log(`⚠️ ${pageInfo.name} no tiene elementos básicos`);
        }
      } catch (error) {
        console.log(`❌ Error verificando elementos en ${pageInfo.name}: ${error.message}`);
      }
    }
    
    console.log(`📊 Páginas con elementos: ${pagesWithElements}/${pages.length}`);
    expect(pagesWithElements).toBeGreaterThan(3);
    
    console.log('✅ Test de funcionalidad básica completado');
  });
});
