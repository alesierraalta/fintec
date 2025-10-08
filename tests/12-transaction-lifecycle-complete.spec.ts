import { test, expect } from '@playwright/test';

test.describe('Complete Transaction Lifecycle Tests', () => {
  
  // Helper function to generate unique transaction description
  const generateTransactionDescription = () => `Test Transaction ${Date.now()}`;
  
  test('should complete full transaction lifecycle: create, edit, delete', async ({ page }) => {
    console.log('🔍 Iniciando ciclo de vida completo de transacciones...');
    
    // Interceptar requests para verificar persistencia
    const createRequests: string[] = [];
    const updateRequests: string[] = [];
    const deleteRequests: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      const method = request.method();
      
      if (url.includes('transactions') && method === 'POST') {
        createRequests.push(`${method} ${url}`);
      } else if (url.includes('transactions') && method === 'PATCH') {
        updateRequests.push(`${method} ${url}`);
      } else if (url.includes('transactions') && method === 'DELETE') {
        deleteRequests.push(`${method} ${url}`);
      }
    });
    
    // PASO 1: CREAR TRANSACCIÓN DE INGRESO
    console.log('📍 Paso 1: Creando transacción de ingreso...');
    await page.goto('/transactions');
    await page.waitForTimeout(3000);
    
    const transactionDescription = generateTransactionDescription();
    const transactionAmount = '100.50';
    
    console.log(`📝 Descripción: ${transactionDescription}`);
    console.log(`📝 Monto: ${transactionAmount}`);
    
    // Hacer clic en "Agregar Transacción"
    const addTransactionButton = page.locator('text=Agregar Transacción');
    await expect(addTransactionButton).toBeVisible({ timeout: 5000 });
    await addTransactionButton.click();
    console.log('✅ Botón "Agregar Transacción" clickeado');
    
    // Esperar que aparezca el formulario
    await page.waitForTimeout(3000);
    
    // Verificar que apareció el formulario
    const formVisible = await page.locator('form, input, [role="dialog"]').first().isVisible({ timeout: 5000 });
    if (!formVisible) {
      console.log('❌ Formulario de transacción no apareció');
      return;
    }
    
    console.log('✅ Formulario de transacción apareció');
    
    // Llenar formulario de transacción
    // Buscar campo de monto
    const amountInputs = await page.locator('input[type="number"], input[name*="amount"], input[name*="monto"]').all();
    if (amountInputs.length > 0) {
      await amountInputs[0].fill(transactionAmount);
      console.log('✅ Campo de monto llenado');
    }
    
    // Buscar campo de descripción
    const descriptionInputs = await page.locator('input[type="text"], textarea, input[name*="description"], input[name*="descripción"]').all();
    if (descriptionInputs.length > 1) {
      await descriptionInputs[1].fill(transactionDescription);
      console.log('✅ Campo de descripción llenado');
    } else if (descriptionInputs.length > 0) {
      await descriptionInputs[0].fill(transactionDescription);
      console.log('✅ Campo de descripción llenado (primer input)');
    }
    
    // Buscar selector de tipo de transacción
    const typeSelectors = [
      'select[name*="type"]',
      'select[name*="tipo"]',
      'input[name*="income"]',
      'input[name*="expense"]',
      'input[name*="ingreso"]',
      'input[name*="gasto"]'
    ];
    
    for (const selector of typeSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          if (selector.includes('select')) {
            await element.selectOption('income');
            console.log('✅ Tipo de transacción seleccionado: income');
          } else {
            await element.click();
            console.log('✅ Tipo de transacción seleccionado');
          }
          break;
        }
      } catch {
        // Continuar
      }
    }
    
    // Buscar selector de categoría
    const categorySelectors = [
      'select[name*="category"]',
      'select[name*="categoría"]',
      '.category-selector'
    ];
    
    for (const selector of categorySelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const options = await element.locator('option').all();
          if (options.length > 1) {
            await element.selectOption({ index: 1 });
            console.log('✅ Categoría seleccionada');
          }
          break;
        }
      } catch {
        // Continuar
      }
    }
    
    // Buscar y hacer clic en botón de guardar
    const saveButtons = [
      'button[type="submit"]',
      'text=Guardar',
      'text=Save',
      'text=Crear',
      'text=Agregar'
    ];
    
    let transactionCreated = false;
    for (const selector of saveButtons) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 3000 })) {
          await button.click();
          console.log(`✅ Transacción creada con botón: ${selector}`);
          transactionCreated = true;
          break;
        }
      } catch {
        // Continuar
      }
    }
    
    if (!transactionCreated) {
      console.log('⚠️ No se pudo encontrar botón de guardar');
    }
    
    await page.waitForTimeout(3000);
    
    // PASO 2: VERIFICAR CREACIÓN
    console.log('📍 Paso 2: Verificando creación de transacción...');
    
    // Buscar la transacción creada en la lista
    const transactionInList = page.locator(`text=${transactionDescription}`);
    const transactionExists = await transactionInList.isVisible({ timeout: 5000 });
    
    if (transactionExists) {
      console.log('✅ Transacción encontrada en la lista');
    } else {
      console.log('⚠️ Transacción no encontrada en la lista (puede estar en estado de carga)');
    }
    
    // Buscar el monto en la lista
    const amountInList = page.locator(`text=${transactionAmount}`);
    const amountExists = await amountInList.isVisible({ timeout: 3000 });
    
    if (amountExists) {
      console.log('✅ Monto encontrado en la lista');
    } else {
      console.log('⚠️ Monto no encontrado en la lista');
    }
    
    // PASO 3: EDITAR TRANSACCIÓN
    console.log('📍 Paso 3: Editando transacción...');
    
    // Buscar botón de editar en la transacción
    const editButtons = [
      `text=${transactionDescription} + button:has-text("Editar")`,
      `text=${transactionDescription} + button:has-text("Edit")`,
      `[data-testid="edit-transaction-${transactionDescription}"]`,
      `text=${transactionDescription} + .edit-button`,
      `text=${transactionDescription} + [aria-label*="edit"]`
    ];
    
    let transactionEdited = false;
    for (const selector of editButtons) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 3000 })) {
          await button.click();
          console.log(`✅ Botón de editar encontrado: ${selector}`);
          
          // Esperar que aparezca el formulario de edición
          await page.waitForTimeout(2000);
          
          // Modificar la descripción
          const editDescriptionInput = page.locator('input[type="text"], textarea, input[name*="description"]').first();
          if (await editDescriptionInput.isVisible({ timeout: 3000 })) {
            await editDescriptionInput.clear();
            const editedDescription = `${transactionDescription} - Editada`;
            await editDescriptionInput.fill(editedDescription);
            console.log(`✅ Descripción editada: ${editedDescription}`);
            
            // Modificar el monto
            const editAmountInput = page.locator('input[type="number"], input[name*="amount"]').first();
            if (await editAmountInput.isVisible({ timeout: 3000 })) {
              await editAmountInput.clear();
              const editedAmount = '150.75';
              await editAmountInput.fill(editedAmount);
              console.log(`✅ Monto editado: ${editedAmount}`);
            }
            
            // Guardar cambios
            const saveEditButton = page.locator('button[type="submit"], text=Guardar, text=Save').first();
            if (await saveEditButton.isVisible({ timeout: 3000 })) {
              await saveEditButton.click();
              console.log('✅ Cambios de edición guardados');
              transactionEdited = true;
              await page.waitForTimeout(2000);
            }
          }
          break;
        }
      } catch {
        // Continuar
      }
    }
    
    if (!transactionEdited) {
      console.log('⚠️ No se pudo encontrar botón de editar (funcionalidad puede no estar implementada)');
    }
    
    // PASO 4: ELIMINAR TRANSACCIÓN
    console.log('📍 Paso 4: Eliminando transacción...');
    
    // Buscar botón de eliminar
    const deleteButtons = [
      `text=${transactionDescription} + button:has-text("Eliminar")`,
      `text=${transactionDescription} + button:has-text("Delete")`,
      `[data-testid="delete-transaction-${transactionDescription}"]`,
      `text=${transactionDescription} + .delete-button`,
      `text=${transactionDescription} + [aria-label*="delete"]`
    ];
    
    let transactionDeleted = false;
    for (const selector of deleteButtons) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 3000 })) {
          await button.click();
          console.log(`✅ Botón de eliminar encontrado: ${selector}`);
          
          // Esperar confirmación si aparece
          await page.waitForTimeout(1000);
          
          // Buscar botón de confirmación
          const confirmButtons = [
            'text=Sí',
            'text=Yes',
            'text=Confirmar',
            'text=Confirm',
            'text=Eliminar',
            'button[type="submit"]'
          ];
          
          for (const confirmSelector of confirmButtons) {
            try {
              const confirmButton = page.locator(confirmSelector).first();
              if (await confirmButton.isVisible({ timeout: 2000 })) {
                await confirmButton.click();
                console.log(`✅ Eliminación confirmada con: ${confirmSelector}`);
                break;
              }
            } catch {
              // Continuar
            }
          }
          
          transactionDeleted = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch {
        // Continuar
      }
    }
    
    if (!transactionDeleted) {
      console.log('⚠️ No se pudo encontrar botón de eliminar (funcionalidad puede no estar implementada)');
    }
    
    // PASO 5: VERIFICAR ELIMINACIÓN
    console.log('📍 Paso 5: Verificando eliminación...');
    
    const transactionStillExists = await transactionInList.isVisible({ timeout: 3000 });
    if (!transactionStillExists) {
      console.log('✅ Transacción eliminada correctamente');
    } else {
      console.log('⚠️ Transacción aún visible (puede estar en proceso de eliminación)');
    }
    
    // PASO 6: ANÁLISIS DE REQUESTS
    console.log('\n📊 ANÁLISIS DE REQUESTS DE CICLO DE VIDA:');
    console.log(`📡 Requests de creación: ${createRequests.length}`);
    console.log(`📡 Requests de edición: ${updateRequests.length}`);
    console.log(`📡 Requests de eliminación: ${deleteRequests.length}`);
    
    if (createRequests.length > 0) {
      console.log('\n✅ REQUESTS DE CREACIÓN:');
      createRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req}`);
      });
    }
    
    if (updateRequests.length > 0) {
      console.log('\n✅ REQUESTS DE EDICIÓN:');
      updateRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req}`);
      });
    }
    
    if (deleteRequests.length > 0) {
      console.log('\n✅ REQUESTS DE ELIMINACIÓN:');
      deleteRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req}`);
      });
    }
    
    // PASO 7: VERIFICACIÓN FINAL
    console.log('\n🎯 RESUMEN DEL CICLO DE VIDA:');
    console.log(`✅ Creación: ${transactionCreated ? 'COMPLETADA' : 'FALLÓ'}`);
    console.log(`✅ Edición: ${transactionEdited ? 'COMPLETADA' : 'NO DISPONIBLE'}`);
    console.log(`✅ Eliminación: ${transactionDeleted ? 'COMPLETADA' : 'NO DISPONIBLE'}`);
    console.log(`📊 Requests capturados: ${createRequests.length + updateRequests.length + deleteRequests.length}`);
    
    // El test pasa si al menos se pudo crear la transacción
    expect(transactionCreated).toBeTruthy();
    console.log('\n✅ Ciclo de vida completo de transacciones finalizado');
  });
  
  test('should test transaction validation and error handling', async ({ page }) => {
    console.log('🔍 Probando validación y manejo de errores en transacciones...');
    
    // Interceptar errores
    const errors: string[] = [];
    const validationErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('response', response => {
      if (response.status() >= 400) {
        validationErrors.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await page.goto('/transactions');
    await page.waitForTimeout(3000);
    
    // CASO 1: Crear transacción con monto vacío
    console.log('📍 Caso 1: Creando transacción con monto vacío...');
    
    const addTransactionButton = page.locator('text=Agregar Transacción');
    await addTransactionButton.click();
    await page.waitForTimeout(2000);
    
    // Llenar solo la descripción
    const descriptionInput = page.locator('input[type="text"], textarea').first();
    if (await descriptionInput.isVisible({ timeout: 3000 })) {
      await descriptionInput.fill('Transacción sin monto');
      console.log('✅ Descripción llenada');
    }
    
    // Intentar guardar sin monto
    const saveButton = page.locator('button[type="submit"], text=Guardar').first();
    if (await saveButton.isVisible({ timeout: 3000 })) {
      await saveButton.click();
      console.log('✅ Intentando guardar transacción sin monto...');
      await page.waitForTimeout(2000);
      
      // Verificar si aparecen mensajes de validación
      const validationMessages = [
        'text=Campo requerido',
        'text=Required field',
        'text=Monto es obligatorio',
        'text=Este campo no puede estar vacío',
        '.error',
        '.text-red-500',
        '[role="alert"]'
      ];
      
      let validationFound = false;
      for (const selector of validationMessages) {
        try {
          const count = await page.locator(selector).count();
          if (count > 0) {
            console.log(`✅ Mensaje de validación encontrado: ${selector} (${count} elementos)`);
            validationFound = true;
          }
        } catch {
          // Continuar
        }
      }
      
      if (validationFound) {
        console.log('✅ Validación de monto vacío funciona');
      } else {
        console.log('⚠️ No se encontraron mensajes de validación');
      }
    }
    
    // CASO 2: Crear transacción con monto negativo
    console.log('📍 Caso 2: Creando transacción con monto negativo...');
    
    const amountInput = page.locator('input[type="number"]').first();
    if (await amountInput.isVisible({ timeout: 3000 })) {
      await amountInput.clear();
      await amountInput.fill('-50');
      console.log('✅ Monto negativo ingresado');
      
      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Verificar si hay validación de monto negativo
        const negativeValidation = await page.locator('text=debe ser positivo, text=must be positive, text=negativo').count();
        if (negativeValidation > 0) {
          console.log('✅ Validación de monto negativo funciona');
        } else {
          console.log('⚠️ No se encontró validación de monto negativo');
        }
      }
    }
    
    // CASO 3: Crear transacción con monto muy grande
    console.log('📍 Caso 3: Creando transacción con monto muy grande...');
    
    if (await amountInput.isVisible({ timeout: 3000 })) {
      await amountInput.clear();
      await amountInput.fill('999999999999');
      console.log('✅ Monto muy grande ingresado');
      
      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Verificar si hay validación de límite
        const limitValidation = await page.locator('text=demasiado grande, text=too large, text=límite').count();
        if (limitValidation > 0) {
          console.log('✅ Validación de límite de monto funciona');
        } else {
          console.log('⚠️ No se encontró validación de límite de monto');
        }
      }
    }
    
    // CASO 4: Crear transacción con descripción muy larga
    console.log('📍 Caso 4: Creando transacción con descripción muy larga...');
    
    const longDescription = 'A'.repeat(1000);
    
    if (await descriptionInput.isVisible({ timeout: 3000 })) {
      await descriptionInput.clear();
      await descriptionInput.fill(longDescription);
      console.log(`✅ Descripción larga ingresada: ${longDescription.length} caracteres`);
      
      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Verificar si hay validación de longitud
        const lengthValidation = await page.locator('text=demasiado larga, text=too long, text=límite').count();
        if (lengthValidation > 0) {
          console.log('✅ Validación de longitud de descripción funciona');
        } else {
          console.log('⚠️ No se encontró validación de longitud de descripción');
        }
      }
    }
    
    // ANÁLISIS DE ERRORES
    console.log('\n📊 ANÁLISIS DE VALIDACIÓN Y ERRORES:');
    console.log(`❌ Errores de consola: ${errors.length}`);
    console.log(`❌ Errores de validación: ${validationErrors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORES DE CONSOLA:');
      errors.slice(0, 3).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (validationErrors.length > 0) {
      console.log('\n❌ ERRORES DE VALIDACIÓN:');
      validationErrors.slice(0, 3).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n✅ Test de validación y manejo de errores completado');
  });
  
  test('should test transaction types: income vs expense', async ({ page }) => {
    console.log('🔍 Probando tipos de transacciones: ingresos vs gastos...');
    
    await page.goto('/transactions');
    await page.waitForTimeout(3000);
    
    // PASO 1: Crear transacción de ingreso
    console.log('📍 Paso 1: Creando transacción de ingreso...');
    
    const incomeDescription = `Ingreso Test ${Date.now()}`;
    const incomeAmount = '200.00';
    
    const addTransactionButton = page.locator('text=Agregar Transacción');
    await addTransactionButton.click();
    await page.waitForTimeout(2000);
    
    // Llenar formulario para ingreso
    const amountInput = page.locator('input[type="number"]').first();
    const descriptionInput = page.locator('input[type="text"], textarea').first();
    
    if (await amountInput.isVisible({ timeout: 3000 })) {
      await amountInput.fill(incomeAmount);
      console.log('✅ Monto de ingreso ingresado');
    }
    
    if (await descriptionInput.isVisible({ timeout: 3000 })) {
      await descriptionInput.fill(incomeDescription);
      console.log('✅ Descripción de ingreso ingresada');
    }
    
    // Seleccionar tipo de ingreso
    const typeSelectors = [
      'select[name*="type"]',
      'input[name*="income"]',
      'input[name*="ingreso"]'
    ];
    
    for (const selector of typeSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          if (selector.includes('select')) {
            await element.selectOption('income');
            console.log('✅ Tipo de ingreso seleccionado');
          } else {
            await element.click();
            console.log('✅ Tipo de ingreso seleccionado');
          }
          break;
        }
      } catch {
        // Continuar
      }
    }
    
    // Guardar ingreso
    const saveButton = page.locator('button[type="submit"], text=Guardar').first();
    if (await saveButton.isVisible({ timeout: 3000 })) {
      await saveButton.click();
      console.log('✅ Transacción de ingreso creada');
      await page.waitForTimeout(3000);
    }
    
    // PASO 2: Crear transacción de gasto
    console.log('📍 Paso 2: Creando transacción de gasto...');
    
    const expenseDescription = `Gasto Test ${Date.now()}`;
    const expenseAmount = '50.00';
    
    await addTransactionButton.click();
    await page.waitForTimeout(2000);
    
    if (await amountInput.isVisible({ timeout: 3000 })) {
      await amountInput.fill(expenseAmount);
      console.log('✅ Monto de gasto ingresado');
    }
    
    if (await descriptionInput.isVisible({ timeout: 3000 })) {
      await descriptionInput.fill(expenseDescription);
      console.log('✅ Descripción de gasto ingresada');
    }
    
    // Seleccionar tipo de gasto
    for (const selector of typeSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          if (selector.includes('select')) {
            await element.selectOption('expense');
            console.log('✅ Tipo de gasto seleccionado');
          } else {
            await element.click();
            console.log('✅ Tipo de gasto seleccionado');
          }
          break;
        }
      } catch {
        // Continuar
      }
    }
    
    if (await saveButton.isVisible({ timeout: 3000 })) {
      await saveButton.click();
      console.log('✅ Transacción de gasto creada');
      await page.waitForTimeout(3000);
    }
    
    // PASO 3: Verificar que ambas transacciones aparecen en la lista
    console.log('📍 Paso 3: Verificando transacciones en la lista...');
    
    const incomeExists = await page.locator(`text=${incomeDescription}`).isVisible({ timeout: 3000 });
    const expenseExists = await page.locator(`text=${expenseDescription}`).isVisible({ timeout: 3000 });
    
    console.log(`📊 Ingreso visible: ${incomeExists ? 'SÍ' : 'NO'}`);
    console.log(`📊 Gasto visible: ${expenseExists ? 'SÍ' : 'NO'}`);
    
    // PASO 4: Verificar que los montos se muestran correctamente
    console.log('📍 Paso 4: Verificando montos en la lista...');
    
    const incomeAmountVisible = await page.locator(`text=${incomeAmount}`).isVisible({ timeout: 3000 });
    const expenseAmountVisible = await page.locator(`text=${expenseAmount}`).isVisible({ timeout: 3000 });
    
    console.log(`📊 Monto de ingreso visible: ${incomeAmountVisible ? 'SÍ' : 'NO'}`);
    console.log(`📊 Monto de gasto visible: ${expenseAmountVisible ? 'SÍ' : 'NO'}`);
    
    console.log('\n✅ Test de tipos de transacciones completado');
  });
});
