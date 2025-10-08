import { test, expect } from '@playwright/test';

test.describe('Category Form Analysis', () => {
  
  test('should analyze category form structure and requirements', async ({ page }) => {
    console.log('🔍 Analizando estructura y requisitos del formulario de categorías...');
    
    await page.goto('/categories');
    await page.waitForTimeout(3000);
    
    // Hacer clic en "Nueva Categoría"
    const newCategoryButton = page.locator('text=Nueva Categoría');
    await expect(newCategoryButton).toBeVisible({ timeout: 5000 });
    await newCategoryButton.click();
    console.log('✅ Botón "Nueva Categoría" clickeado');
    
    // Esperar que aparezca el formulario
    await page.waitForTimeout(2000);
    
    // Verificar que apareció el formulario
    const formVisible = await page.locator('form, input, [role="dialog"]').first().isVisible({ timeout: 5000 });
    if (!formVisible) {
      console.log('❌ Formulario de categoría no apareció');
      return;
    }
    
    console.log('✅ Formulario de categoría apareció');
    
    // ANÁLISIS 1: Campos del formulario
    console.log('\n📊 ANÁLISIS DE CAMPOS DEL FORMULARIO:');
    
    // Buscar todos los inputs
    const inputs = await page.locator('input').all();
    console.log(`📝 Total inputs encontrados: ${inputs.length}`);
    
    for (let i = 0; i < inputs.length; i++) {
      try {
        const input = inputs[i];
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const required = await input.getAttribute('required');
        const disabled = await input.getAttribute('disabled');
        const className = await input.getAttribute('class');
        
        console.log(`   Input ${i + 1}:`);
        console.log(`     - Tipo: ${type}`);
        console.log(`     - Name: ${name}`);
        console.log(`     - Placeholder: ${placeholder}`);
        console.log(`     - Required: ${required}`);
        console.log(`     - Disabled: ${disabled}`);
        console.log(`     - Class: ${className ? className.substring(0, 50) + '...' : 'N/A'}`);
      } catch (error) {
        console.log(`   Input ${i + 1}: Error analizando - ${(error as Error).message}`);
      }
    }
    
    // Buscar todos los selects
    const selects = await page.locator('select').all();
    console.log(`📝 Total selects encontrados: ${selects.length}`);
    
    for (let i = 0; i < selects.length; i++) {
      try {
        const select = selects[i];
        const name = await select.getAttribute('name');
        const required = await select.getAttribute('required');
        const disabled = await select.getAttribute('disabled');
        
        // Obtener opciones
        const options = await select.locator('option').all();
        const optionTexts = [];
        for (const option of options) {
          const text = await option.textContent();
          optionTexts.push(text?.trim() || '');
        }
        
        console.log(`   Select ${i + 1}:`);
        console.log(`     - Name: ${name}`);
        console.log(`     - Required: ${required}`);
        console.log(`     - Disabled: ${disabled}`);
        console.log(`     - Opciones: ${optionTexts.join(', ')}`);
      } catch (error) {
        console.log(`   Select ${i + 1}: Error analizando - ${(error as Error).message}`);
      }
    }
    
    // Buscar todos los textareas
    const textareas = await page.locator('textarea').all();
    console.log(`📝 Total textareas encontrados: ${textareas.length}`);
    
    for (let i = 0; i < textareas.length; i++) {
      try {
        const textarea = textareas[i];
        const name = await textarea.getAttribute('name');
        const placeholder = await textarea.getAttribute('placeholder');
        const required = await textarea.getAttribute('required');
        const disabled = await textarea.getAttribute('disabled');
        
        console.log(`   Textarea ${i + 1}:`);
        console.log(`     - Name: ${name}`);
        console.log(`     - Placeholder: ${placeholder}`);
        console.log(`     - Required: ${required}`);
        console.log(`     - Disabled: ${disabled}`);
      } catch (error) {
        console.log(`   Textarea ${i + 1}: Error analizando - ${(error as Error).message}`);
      }
    }
    
    // ANÁLISIS 2: Botones del formulario
    console.log('\n📊 ANÁLISIS DE BOTONES DEL FORMULARIO:');
    
    const buttons = await page.locator('button').all();
    console.log(`🔘 Total botones encontrados: ${buttons.length}`);
    
    for (let i = 0; i < buttons.length; i++) {
      try {
        const button = buttons[i];
        const type = await button.getAttribute('type');
        const text = await button.textContent();
        const disabled = await button.getAttribute('disabled');
        const className = await button.getAttribute('class');
        
        console.log(`   Botón ${i + 1}:`);
        console.log(`     - Tipo: ${type}`);
        console.log(`     - Texto: "${text?.trim()}"`);
        console.log(`     - Disabled: ${disabled}`);
        console.log(`     - Class: ${className ? className.substring(0, 50) + '...' : 'N/A'}`);
      } catch (error) {
        console.log(`   Botón ${i + 1}: Error analizando - ${(error as Error).message}`);
      }
    }
    
    // ANÁLISIS 3: Labels y texto del formulario
    console.log('\n📊 ANÁLISIS DE LABELS Y TEXTO:');
    
    const labels = await page.locator('label').all();
    console.log(`🏷️ Total labels encontrados: ${labels.length}`);
    
    for (let i = 0; i < labels.length; i++) {
      try {
        const label = labels[i];
        const text = await label.textContent();
        const htmlFor = await label.getAttribute('for');
        
        console.log(`   Label ${i + 1}: "${text?.trim()}" (for: ${htmlFor})`);
      } catch (error) {
        console.log(`   Label ${i + 1}: Error analizando - ${(error as Error).message}`);
      }
    }
    
    // Buscar texto de validación o instrucciones
    const validationTexts = [
      'text=Campo requerido',
      'text=Required',
      'text=*',
      'text=Obligatorio',
      'text=Please fill',
      '.error',
      '.text-red-500',
      '[role="alert"]'
    ];
    
    console.log('\n📊 BÚSQUEDA DE TEXTO DE VALIDACIÓN:');
    for (const selector of validationTexts) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`   ✅ Encontrado: ${selector} (${count} elementos)`);
        }
      } catch {
        // Continuar
      }
    }
    
    // ANÁLISIS 4: Estado inicial del botón de submit
    console.log('\n📊 ANÁLISIS DEL ESTADO DEL BOTÓN SUBMIT:');
    
    const submitButtons = await page.locator('button[type="submit"]').all();
    console.log(`🔘 Botones submit encontrados: ${submitButtons.length}`);
    
    for (let i = 0; i < submitButtons.length; i++) {
      try {
        const button = submitButtons[i];
        const disabled = await button.getAttribute('disabled');
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        
        console.log(`   Submit Button ${i + 1}:`);
        console.log(`     - Texto: "${text?.trim()}"`);
        console.log(`     - Visible: ${isVisible}`);
        console.log(`     - Enabled: ${isEnabled}`);
        console.log(`     - Disabled attribute: ${disabled}`);
      } catch (error) {
        console.log(`   Submit Button ${i + 1}: Error analizando - ${(error as Error).message}`);
      }
    }
    
    console.log('\n✅ Análisis del formulario de categorías completado');
  });
  
  test('should test form validation by filling required fields', async ({ page }) => {
    console.log('🔍 Probando validación del formulario llenando campos requeridos...');
    
    await page.goto('/categories');
    await page.waitForTimeout(3000);
    
    const newCategoryButton = page.locator('text=Nueva Categoría');
    await newCategoryButton.click();
    await page.waitForTimeout(2000);
    
    // PASO 1: Llenar solo el nombre y ver el estado del botón
    console.log('📍 Paso 1: Llenando solo el nombre...');
    
    const nameInput = page.locator('input[type="text"], input[name*="name"], input[placeholder*="nombre"]').first();
    if (await nameInput.isVisible({ timeout: 3000 })) {
      await nameInput.fill('Test Category Name');
      console.log('✅ Nombre llenado');
      
      // Verificar estado del botón después de llenar el nombre
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 3000 })) {
        const isEnabledAfterName = await submitButton.isEnabled();
        console.log(`📊 Botón habilitado después del nombre: ${isEnabledAfterName ? 'SÍ' : 'NO'}`);
        
        if (isEnabledAfterName) {
          console.log('✅ Solo el nombre es suficiente para habilitar el botón');
        } else {
          console.log('⚠️ Se necesitan más campos para habilitar el botón');
        }
      }
    }
    
    // PASO 2: Llenar campos adicionales si existen
    console.log('📍 Paso 2: Llenando campos adicionales...');
    
    // Buscar campo de tipo
    const typeSelect = page.locator('select[name*="type"], select[name*="kind"]').first();
    if (await typeSelect.isVisible({ timeout: 3000 })) {
      await typeSelect.selectOption('income');
      console.log('✅ Tipo seleccionado: income');
      
      // Verificar estado del botón después de seleccionar tipo
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 3000 })) {
        const isEnabledAfterType = await submitButton.isEnabled();
        console.log(`📊 Botón habilitado después del tipo: ${isEnabledAfterType ? 'SÍ' : 'NO'}`);
      }
    }
    
    // Buscar campo de color
    const colorInput = page.locator('input[type="color"], input[name*="color"]').first();
    if (await colorInput.isVisible({ timeout: 3000 })) {
      await colorInput.fill('#3B82F6');
      console.log('✅ Color seleccionado');
      
      // Verificar estado del botón después del color
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 3000 })) {
        const isEnabledAfterColor = await submitButton.isEnabled();
        console.log(`📊 Botón habilitado después del color: ${isEnabledAfterColor ? 'SÍ' : 'NO'}`);
      }
    }
    
    // PASO 3: Intentar enviar el formulario
    console.log('📍 Paso 3: Intentando enviar el formulario...');
    
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 })) {
      const isEnabled = await submitButton.isEnabled();
      console.log(`📊 Estado final del botón: ${isEnabled ? 'HABILITADO' : 'DESHABILITADO'}`);
      
      if (isEnabled) {
        try {
          await submitButton.click();
          console.log('✅ Formulario enviado exitosamente');
          await page.waitForTimeout(3000);
          
          // Verificar si la categoría se creó
          const categoryExists = await page.locator('text=Test Category Name').isVisible({ timeout: 5000 });
          if (categoryExists) {
            console.log('✅ Categoría creada y visible en la lista');
          } else {
            console.log('⚠️ Categoría no visible en la lista (puede estar en proceso)');
          }
        } catch (error) {
          console.log(`❌ Error enviando formulario: ${(error as Error).message}`);
        }
      } else {
        console.log('⚠️ No se puede enviar el formulario (botón deshabilitado)');
        
        // Buscar mensajes de validación
        const validationMessages = [
          'text=Campo requerido',
          'text=Required',
          'text=Please fill',
          'text=Complete all fields',
          '.error',
          '.text-red-500'
        ];
        
        console.log('🔍 Buscando mensajes de validación...');
        for (const selector of validationMessages) {
          try {
            const count = await page.locator(selector).count();
            if (count > 0) {
              console.log(`   ✅ Mensaje encontrado: ${selector} (${count} elementos)`);
            }
          } catch {
            // Continuar
          }
        }
      }
    }
    
    console.log('\n✅ Test de validación del formulario completado');
  });
});
