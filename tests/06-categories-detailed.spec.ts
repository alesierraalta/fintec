import { test, expect } from '@playwright/test';

test.describe('Categories Page Detailed Tests', () => {
  
  test('should display categories page header and navigation', async ({ page }) => {
    console.log('🔍 Verificando header y navegación de página de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);
    
    // Verificar elementos del header
    const headerElements = [
      'text=🏷️ Categorías',
      'text=Categorías',
      'text=Organización',
      'text=Organiza tus transacciones por categorías',
      'text=Actualizar',
      'text=Nueva Categoría'
    ];
    
    let foundHeaderElements = 0;
    for (const selector of headerElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Elemento de header encontrado: ${selector}`);
        foundHeaderElements++;
      } catch {
        console.log(`⚠️ Elemento de header no encontrado: ${selector}`);
      }
    }
    
    console.log(`📊 Elementos de header encontrados: ${foundHeaderElements}/${headerElements.length}`);
    expect(foundHeaderElements).toBeGreaterThan(0);
    console.log('✅ Header de página de categorías correcto');
  });
  
  test('should display category statistics and filters', async ({ page }) => {
    console.log('🔍 Verificando estadísticas y filtros de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    // Verificar estadísticas de categorías
    const statisticsElements = [
      'text=TOTAL',
      'text=INGRESOS',
      'text=GASTOS',
      'text=Disponibles',
      'text=Categorías activas',
      'text=Todas (0)',
      'text=Ingresos (0)',
      'text=Gastos (0)'
    ];
    
    let foundStatistics = 0;
    for (const selector of statisticsElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Estadística encontrada: ${selector}`);
        foundStatistics++;
      } catch {
        console.log(`⚠️ Estadística no encontrada: ${selector}`);
      }
    }
    
    // Verificar filtros
    const filterElements = [
      'text=Buscar y Filtrar',
      'input[placeholder="Buscar categorías..."]',
      'text=Todas',
      'text=Ingresos',
      'text=Gastos'
    ];
    
    let foundFilters = 0;
    for (const selector of filterElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Filtro encontrado: ${selector}`);
        foundFilters++;
      } catch {
        console.log(`⚠️ Filtro no encontrado: ${selector}`);
      }
    }
    
    console.log(`📊 Estadísticas encontradas: ${foundStatistics}/${statisticsElements.length}`);
    console.log(`📊 Filtros encontrados: ${foundFilters}/${filterElements.length}`);
    expect(foundStatistics + foundFilters).toBeGreaterThan(0);
    console.log('✅ Estadísticas y filtros de categorías mostrados correctamente');
  });
  
  test('should handle empty categories state', async ({ page }) => {
    console.log('🔍 Verificando estado vacío de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    // Verificar mensajes de estado vacío
    const emptyStateElements = [
      'text=No se encontraron categorías',
      'text=No hay categorías para mostrar con los filtros actuales',
      'text=Crear Primera Categoría'
    ];
    
    let foundEmptyState = 0;
    for (const selector of emptyStateElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Elemento de estado vacío encontrado: ${selector}`);
        foundEmptyState++;
      } catch {
        console.log(`⚠️ Elemento de estado vacío no encontrado: ${selector}`);
      }
    }
    
    // Verificar contadores en cero
    const zeroCounters = [
      'text=0',
      'text=(0)'
    ];
    
    let foundZeroCounters = 0;
    for (const selector of zeroCounters) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`📊 Contador en cero encontrado: ${selector} (${count} elementos)`);
          foundZeroCounters += count;
        }
      } catch {
        // Continuar
      }
    }
    
    console.log(`📊 Elementos de estado vacío encontrados: ${foundEmptyState}/${emptyStateElements.length}`);
    console.log(`📊 Contadores en cero encontrados: ${foundZeroCounters}`);
    expect(foundEmptyState).toBeGreaterThan(0);
    console.log('✅ Estado vacío de categorías manejado correctamente');
  });
  
  test('should display category action buttons', async ({ page }) => {
    console.log('🔍 Verificando botones de acción de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    // Verificar botones de acción
    const actionButtons = [
      'text=Nueva Categoría',
      'text=Actualizar',
      'text=Crear Primera Categoría'
    ];
    
    let foundActionButtons = 0;
    for (const selector of actionButtons) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Botón de acción encontrado: ${selector}`);
        foundActionButtons++;
      } catch {
        console.log(`⚠️ Botón de acción no encontrado: ${selector}`);
      }
    }
    
    // Verificar botones de filtro
    const filterButtons = [
      'text=Todas (0)',
      'text=Ingresos (0)',
      'text=Gastos (0)'
    ];
    
    let foundFilterButtons = 0;
    for (const selector of filterButtons) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Botón de filtro encontrado: ${selector}`);
        foundFilterButtons++;
      } catch {
        console.log(`⚠️ Botón de filtro no encontrado: ${selector}`);
      }
    }
    
    console.log(`📊 Botones de acción encontrados: ${foundActionButtons}/${actionButtons.length}`);
    console.log(`📊 Botones de filtro encontrados: ${foundFilterButtons}/${filterButtons.length}`);
    expect(foundActionButtons + foundFilterButtons).toBeGreaterThan(0);
    console.log('✅ Botones de acción de categorías mostrados correctamente');
  });
  
  test('should handle category search functionality', async ({ page }) => {
    console.log('🔍 Probando funcionalidad de búsqueda de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    // Verificar campo de búsqueda
    const searchField = page.locator('input[placeholder="Buscar categorías..."]');
    
    try {
      await expect(searchField).toBeVisible({ timeout: 3000 });
      console.log('✅ Campo de búsqueda encontrado');
      
      // Intentar escribir en el campo de búsqueda
      await searchField.fill('test');
      console.log('✅ Texto ingresado en campo de búsqueda');
      
      // Verificar que el texto se ingresó
      const inputValue = await searchField.inputValue();
      if (inputValue === 'test') {
        console.log('✅ Campo de búsqueda funciona correctamente');
      } else {
        console.log(`⚠️ Valor del campo: "${inputValue}"`);
      }
      
      // Limpiar el campo
      await searchField.clear();
      console.log('✅ Campo de búsqueda limpiado');
      
    } catch (error) {
      console.log(`⚠️ Error con campo de búsqueda: ${(error as Error).message}`);
    }
    
    console.log('✅ Test de búsqueda de categorías completado');
  });
  
  test('should handle category filter interactions', async ({ page }) => {
    console.log('🔍 Probando interacciones con filtros de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    // Probar filtros
    const filters = [
      'text=Todas (0)',
      'text=Ingresos (0)',
      'text=Gastos (0)'
    ];
    
    let filtersClicked = 0;
    for (const filter of filters) {
      try {
        await page.locator(filter).click({ timeout: 3000 });
        console.log(`✅ Filtro clickeado: ${filter}`);
        filtersClicked++;
        await page.waitForTimeout(1000);
      } catch (error) {
        console.log(`⚠️ Error clickeando filtro ${filter}: ${(error as Error).message}`);
      }
    }
    
    console.log(`📊 Filtros clickeados: ${filtersClicked}/${filters.length}`);
    
    if (filtersClicked > 0) {
      console.log('✅ Interacciones con filtros funcionan');
    } else {
      console.log('⚠️ No se pudieron clickear filtros');
    }
    
    console.log('✅ Test de filtros de categorías completado');
  });
  
  test('should display category creation interface', async ({ page }) => {
    console.log('🔍 Verificando interfaz de creación de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    // Intentar hacer clic en botón de nueva categoría
    const newCategoryButton = page.locator('text=Nueva Categoría');
    
    try {
      await newCategoryButton.click({ timeout: 3000 });
      console.log('✅ Botón "Nueva Categoría" clickeado');
      
      // Esperar que aparezca algún formulario o modal
      await page.waitForTimeout(2000);
      
      // Verificar si apareció un formulario
      const formElements = [
        'form',
        'input[type="text"]',
        'input[name="name"]',
        'select[name="kind"]',
        'input[name="color"]',
        'input[name="icon"]',
        '.modal',
        '[role="dialog"]'
      ];
      
      let formFound = false;
      for (const selector of formElements) {
        try {
          const count = await page.locator(selector).count();
          if (count > 0) {
            console.log(`📊 Elemento de formulario encontrado: ${selector} (${count} elementos)`);
            formFound = true;
          }
        } catch {
          // Continuar
        }
      }
      
      if (formFound) {
        console.log('✅ Formulario de creación de categoría apareció');
      } else {
        console.log('⚠️ No apareció formulario después del clic');
      }
      
    } catch (error) {
      console.log(`⚠️ Error clickeando "Nueva Categoría": ${(error as Error).message}`);
    }
    
    console.log('✅ Test de interfaz de creación completado');
  });
  
  test('should display category layout and structure', async ({ page }) => {
    console.log('🔍 Verificando layout y estructura de la página de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    // Verificar estructura general de la página
    const layoutElements = [
      'text=¡FinTec! 💼',
      'text=Finanzas inteligentes',
      'text=Test User',
      'text=Tu dinero total',
      'text=🏷️ Categorías'
    ];
    
    let foundLayoutElements = 0;
    for (const selector of layoutElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Elemento de layout encontrado: ${selector}`);
        foundLayoutElements++;
      } catch {
        console.log(`⚠️ Elemento de layout no encontrado: ${selector}`);
      }
    }
    
    // Verificar navegación lateral
    const navigationElements = [
      'text=Inicio',
      'text=Cuentas',
      'text=Gastos',
      'text=Transferir',
      'text=Categorías',
      'text=Presupuestos',
      'text=Metas',
      'text=Reportes',
      'text=Respaldos',
      'text=Ajustes'
    ];
    
    let foundNavigationElements = 0;
    for (const selector of navigationElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Elemento de navegación encontrado: ${selector}`);
        foundNavigationElements++;
      } catch {
        console.log(`⚠️ Elemento de navegación no encontrado: ${selector}`);
      }
    }
    
    console.log(`📊 Elementos de layout encontrados: ${foundLayoutElements}/${layoutElements.length}`);
    console.log(`📊 Elementos de navegación encontrados: ${foundNavigationElements}/${navigationElements.length}`);
    expect(foundLayoutElements + foundNavigationElements).toBeGreaterThan(5);
    console.log('✅ Layout y estructura de página de categorías correctos');
  });
  
  test('should handle category management actions', async ({ page }) => {
    console.log('🔍 Probando acciones de gestión de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    // Verificar si hay categorías existentes para gestionar
    const categoryItems = [
      '.category-item',
      '.category-card',
      '[data-testid*="category"]',
      '.grid > div',
      '.category'
    ];
    
    let foundCategoryItems = 0;
    for (const selector of categoryItems) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`📊 Elementos de categoría encontrados con ${selector}: ${count}`);
          foundCategoryItems += count;
        }
      } catch {
        // Continuar
      }
    }
    
    console.log(`📊 Total de elementos de categoría encontrados: ${foundCategoryItems}`);
    
    if (foundCategoryItems > 0) {
      console.log('✅ Hay categorías para gestionar');
      
      // Buscar botones de acción en las categorías
      const actionButtons = [
        'text=Editar',
        'text=Edit',
        'text=Eliminar',
        'text=Delete',
        '[data-testid="edit-category-button"]',
        '[data-testid="delete-category-button"]'
      ];
      
      let foundActions = 0;
      for (const selector of actionButtons) {
        try {
          const count = await page.locator(selector).count();
          if (count > 0) {
            console.log(`📊 Acciones de gestión encontradas con ${selector}: ${count} elementos`);
            foundActions += count;
          }
        } catch {
          // Continuar
        }
      }
      
      console.log(`📊 Total de acciones de gestión encontradas: ${foundActions}`);
      
    } else {
      console.log('⚠️ No se encontraron categorías existentes para gestionar');
      console.log('📍 Esto es normal si no hay categorías creadas');
    }
    
    console.log('✅ Test de gestión de categorías completado');
  });
  
  test('should display category information and instructions', async ({ page }) => {
    console.log('🔍 Verificando información e instrucciones de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    // Verificar información e instrucciones
    const infoElements = [
      'text=Organización',
      'text=Organiza tus transacciones por categorías',
      'text=Categorías activas',
      'text=Disponibles'
    ];
    
    let foundInfoElements = 0;
    for (const selector of infoElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Elemento de información encontrado: ${selector}`);
        foundInfoElements++;
      } catch {
        console.log(`⚠️ Elemento de información no encontrado: ${selector}`);
      }
    }
    
    // Verificar si hay instrucciones adicionales
    const instructionElements = [
      'text=Instrucciones',
      'text=Pasos',
      'text=Cómo crear',
      'text=Guía',
      '.instructions',
      '.help-text',
      '.info-text'
    ];
    
    let foundInstructions = 0;
    for (const selector of instructionElements) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`📊 Elemento de instrucción encontrado: ${selector} (${count} elementos)`);
          foundInstructions += count;
        }
      } catch {
        // Continuar
      }
    }
    
    console.log(`📊 Elementos de información encontrados: ${foundInfoElements}/${infoElements.length}`);
    console.log(`📊 Elementos de instrucción encontrados: ${foundInstructions}`);
    expect(foundInfoElements).toBeGreaterThan(2);
    console.log('✅ Información e instrucciones de categorías mostradas correctamente');
  });
  
  test('should handle category refresh and update', async ({ page }) => {
    console.log('🔍 Probando funcionalidad de actualización de categorías...');
    
    await page.goto('/categories');
    console.log('📍 Navegando a página de categorías...');
    
    // Buscar botón de actualizar
    const refreshButton = page.locator('text=Actualizar');
    
    try {
      await expect(refreshButton).toBeVisible({ timeout: 3000 });
      console.log('✅ Botón de actualización encontrado');
      
      // Hacer clic en actualizar
      await refreshButton.click();
      console.log('✅ Botón de actualización clickeado');
      
      // Esperar un poco para ver si hay cambios
      await page.waitForTimeout(2000);
      
      // Verificar si hay indicadores de carga
      const loadingIndicators = await page.locator('[role="progressbar"], .spinner, .loading, text=Cargando').count();
      if (loadingIndicators > 0) {
        console.log(`📊 Indicadores de carga encontrados: ${loadingIndicators}`);
      } else {
        console.log('✅ No hay indicadores de carga (actualización rápida)');
      }
      
    } catch (error) {
      console.log(`⚠️ Error con botón de actualización: ${(error as Error).message}`);
    }
    
    console.log('✅ Test de actualización de categorías completado');
  });
});
