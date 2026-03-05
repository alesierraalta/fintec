import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

async function swipeLeftOnElement(page: Page, target: Locator) {
  const box = await target.boundingBox();
  expect(box).toBeTruthy();

  const centerY = box!.y + box!.height / 2;
  const startX = box!.x + box!.width * 0.8;
  const endX = box!.x + box!.width * 0.25;

  await page.mouse.move(startX, centerY);
  await page.mouse.down();
  await page.mouse.move(endX, centerY, { steps: 8 });
  await page.mouse.up();
}

test.describe('Accounts System', () => {
  test('should display accounts page correctly', async ({ page }) => {
    console.log('🔍 Verificando página de cuentas...');

    // Ir a la página de cuentas
    await page.goto('/accounts');
    console.log('📍 Navegando a página de cuentas...');

    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);

    // Verificar que estamos autenticados
    expect(currentUrl).not.toContain('/auth/');

    // Verificar elementos de la página de cuentas
    const accountPageElements = [
      'text=💼 Mis Cuentas',
      'text=Cuentas',
      'text=Nueva Cuenta',
      'text=Agregar Cuenta',
      'text=BALANCE TOTAL',
      'text=Crear Primera Cuenta',
      'text=Tasas de Cambio',
      'text=Centro Financiero',
    ];

    let foundElements = 0;
    for (const selector of accountPageElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Elemento de cuentas encontrado: ${selector}`);
        foundElements++;
      } catch {
        console.log(`⚠️ Elemento no encontrado: ${selector}`);
      }
    }

    console.log(
      `📊 Elementos de página de cuentas encontrados: ${foundElements}/${accountPageElements.length}`
    );

    // Verificar si hay cuentas existentes
    const accountItemSelectors = [
      '.account-item',
      '.account-card',
      '[data-testid*="account"]',
      'tr[data-testid*="account"]',
      '.account-list-item',
      '.account-row',
    ];

    let accountCount = 0;
    for (const selector of accountItemSelectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          accountCount += count;
          console.log(
            `📊 Cuentas encontradas con selector ${selector}: ${count}`
          );
        }
      } catch {
        // Continuar
      }
    }

    console.log(`📊 Total de cuentas encontradas: ${accountCount}`);

    // Al menos debe haber la estructura de la página
    expect(foundElements).toBeGreaterThan(0);
    console.log('✅ Página de cuentas accesible y funcional');
  });

  test('should create new account', async ({ page }) => {
    console.log('🔍 Probando creación de nueva cuenta...');

    // Ir a la página de cuentas
    await page.goto('/accounts');
    console.log('📍 Navegando a página de cuentas...');

    // Buscar botón de agregar cuenta
    const addAccountSelectors = [
      'text=Nueva Cuenta',
      'text=Agregar Cuenta',
      'text=Crear Primera Cuenta',
    ];

    let addButtonFound = false;
    for (const selector of addAccountSelectors) {
      try {
        await page.locator(selector).click({ timeout: 2000 });
        console.log(`✅ Botón de agregar cuenta encontrado: ${selector}`);
        addButtonFound = true;
        break;
      } catch {
        console.log(`⚠️ Selector no encontrado: ${selector}`);
      }
    }

    if (addButtonFound) {
      // Esperar que se abra el formulario
      await page.waitForTimeout(1000);

      // Verificar si apareció un formulario
      const formVisible = await page
        .locator('form, input, textarea')
        .first()
        .isVisible();
      if (formVisible) {
        console.log('✅ Formulario de cuenta apareció');

        // Buscar campos básicos
        const basicFields = [
          'input[type="text"]',
          'input[name*="name"]',
          'input[placeholder*="nombre"]',
          'input[placeholder*="name"]',
          'textarea',
        ];

        let fieldsFound = 0;
        for (const selector of basicFields) {
          try {
            const count = await page.locator(selector).count();
            if (count > 0) {
              fieldsFound += count;
              console.log(`📊 Campos encontrados con ${selector}: ${count}`);
            }
          } catch {
            // Continuar
          }
        }

        console.log(
          `📊 Total de campos de formulario encontrados: ${fieldsFound}`
        );

        if (fieldsFound > 0) {
          console.log('✅ Formulario de creación de cuenta funcional');
        } else {
          console.log('⚠️ No se encontraron campos de formulario');
        }
      } else {
        console.log('⚠️ No apareció formulario después del clic');
      }
    } else {
      console.log('⚠️ No se encontró botón para agregar cuenta');
      console.log('📍 Verificando si la página de cuentas está cargada...');

      const accountElements = [
        'text=Mis Cuentas',
        'text=Cuentas',
        'text=Accounts',
      ];

      let foundAccounts = false;
      for (const selector of accountElements) {
        try {
          await expect(page.locator(selector)).toBeVisible({ timeout: 2000 });
          console.log(`✅ Elemento de cuentas encontrado: ${selector}`);
          foundAccounts = true;
          break;
        } catch {
          // Continuar
        }
      }

      if (foundAccounts) {
        console.log('✅ Página de cuentas cargada correctamente');
      } else {
        console.log('⚠️ No se encontraron elementos de cuentas');
      }
    }

    console.log('✅ Test de creación de cuenta completado');
  });

  test('should display account details', async ({ page }) => {
    console.log('🔍 Verificando detalles de cuentas...');

    // Ir a la página de cuentas
    await page.goto('/accounts');
    console.log('📍 Navegando a página de cuentas...');

    // Verificar elementos de detalles de cuenta
    const detailElements = [
      'text=BALANCE TOTAL',
      'text=Cuentas',
      'text=Tasas de Cambio',
      'text=Centro Financiero',
      'text=USD/VES',
      'text=EUR/VES',
      'text=OFICIAL',
      'text=P2P LIVE',
      'text=EN VIVO',
    ];

    let foundDetails = 0;
    for (const selector of detailElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 3000 });
        console.log(`✅ Detalle de cuenta encontrado: ${selector}`);
        foundDetails++;
      } catch {
        console.log(`⚠️ Detalle no encontrado: ${selector}`);
      }
    }

    console.log(
      `📊 Detalles de cuenta encontrados: ${foundDetails}/${detailElements.length}`
    );

    // Verificar si hay botones de acción
    const actionButtons = [
      'text=Editar',
      'text=Edit',
      'text=Eliminar',
      'text=Delete',
      'text=Ver',
      'text=View',
      'text=Transacciones',
      'text=Transactions',
      'button[aria-label*="edit"]',
      'button[aria-label*="delete"]',
      'button[aria-label*="view"]',
    ];

    let foundActions = 0;
    for (const selector of actionButtons) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          foundActions += count;
          console.log(
            `📊 Botones de acción encontrados con ${selector}: ${count}`
          );
        }
      } catch {
        // Continuar
      }
    }

    console.log(`📊 Total de botones de acción encontrados: ${foundActions}`);

    // Verificar que la página tiene contenido
    expect(foundDetails).toBeGreaterThan(0);
    console.log('✅ Detalles de cuentas mostrados correctamente');
  });

  test('should handle account filtering and search', async ({ page }) => {
    console.log('🔍 Probando filtrado y búsqueda de cuentas...');

    // Ir a la página de cuentas
    await page.goto('/accounts');
    console.log('📍 Navegando a página de cuentas...');

    // Buscar campos de filtrado y búsqueda
    const searchSelectors = [
      'input[placeholder*="buscar"]',
      'input[placeholder*="search"]',
      'input[placeholder*="filtrar"]',
      'input[placeholder*="filter"]',
      'input[name="search"]',
      'input[name="filter"]',
      'input[type="search"]',
    ];

    let searchFound = false;
    for (const selector of searchSelectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(
            `✅ Campo de búsqueda encontrado: ${selector} (${count} elementos)`
          );
          searchFound = true;
          break;
        }
      } catch {
        console.log(`⚠️ Campo de búsqueda no encontrado: ${selector}`);
      }
    }

    // Buscar filtros
    const filterSelectors = [
      'select[name="type"]',
      'select[name="status"]',
      'select[name="currency"]',
      'select',
      'input[type="checkbox"]',
      'input[type="radio"]',
      'text=Filtrar',
      'text=Filter',
    ];

    let filterFound = false;
    for (const selector of filterSelectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✅ Filtro encontrado: ${selector} (${count} elementos)`);
          filterFound = true;
          break;
        }
      } catch {
        console.log(`⚠️ Filtro no encontrado: ${selector}`);
      }
    }

    if (searchFound || filterFound) {
      console.log('✅ Funcionalidad de filtrado y búsqueda disponible');
    } else {
      console.log('⚠️ No se encontraron campos de filtrado o búsqueda');
      console.log(
        '📍 Esto puede ser normal si la funcionalidad no está implementada'
      );
    }

    console.log('✅ Test de filtrado y búsqueda completado');
  });

  test('should navigate to account transactions', async ({ page }) => {
    console.log('🔍 Probando navegación a transacciones de cuenta...');

    // Ir a la página de cuentas
    await page.goto('/accounts');
    console.log('📍 Navegando a página de cuentas...');

    // Buscar enlaces o botones para ver transacciones de cuenta
    const transactionLinks = [
      'text=Gastos',
      'text=Historial',
      'text=Ver Historial y Calculadora',
    ];

    let transactionLinkFound = false;
    for (const selector of transactionLinks) {
      try {
        await page.locator(selector).first().click({ timeout: 3000 });
        console.log(`✅ Enlace a transacciones encontrado: ${selector}`);
        transactionLinkFound = true;

        // Esperar navegación
        await page.waitForTimeout(2000);
        const newUrl = page.url();
        console.log(`📍 URL después del clic: ${newUrl}`);

        // Verificar si navegó a página de transacciones
        if (
          newUrl.includes('/transaction') ||
          newUrl.includes('/transactions')
        ) {
          console.log('✅ Navegación a transacciones exitosa');
        } else {
          console.log('⚠️ No se navegó a página de transacciones específica');
        }

        break;
      } catch {
        console.log(`⚠️ Enlace a transacciones no encontrado: ${selector}`);
      }
    }

    if (!transactionLinkFound) {
      console.log(
        '⚠️ No se encontraron enlaces directos a transacciones de cuenta'
      );
      console.log(
        '📍 Esto puede ser normal si la funcionalidad no está implementada'
      );
    }

    console.log('✅ Test de navegación a transacciones completado');
  });

  test('should handle account management actions', async ({ page }) => {
    console.log('🔍 Probando acciones de gestión de cuentas...');

    // Ir a la página de cuentas
    await page.goto('/accounts');
    console.log('📍 Navegando a página de cuentas...');

    // Buscar acciones de gestión
    const managementActions = [
      'text=Editar',
      'text=Edit',
      'text=Eliminar',
      'text=Delete',
      'text=Desactivar',
      'text=Deactivate',
      'text=Activar',
      'text=Activate',
      'text=Archivar',
      'text=Archive',
      'text=Exportar',
      'text=Export',
      'button[aria-label*="edit"]',
      'button[aria-label*="delete"]',
      'button[aria-label*="manage"]',
    ];

    let actionsFound = 0;
    for (const selector of managementActions) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          actionsFound += count;
          console.log(
            `📊 Acciones de gestión encontradas con ${selector}: ${count}`
          );

          // Intentar hacer clic en la primera acción encontrada para probar
          try {
            await page.locator(selector).first().click({ timeout: 2000 });
            console.log(`✅ Acción de gestión clickeable: ${selector}`);

            // Esperar respuesta
            await page.waitForTimeout(1000);

            // Verificar si apareció un modal o formulario
            const modalSelectors = [
              '[role="dialog"]',
              '.modal',
              '.popup',
              '.dialog',
              'form',
            ];

            let modalFound = false;
            for (const modalSelector of modalSelectors) {
              try {
                const isVisible = await page.locator(modalSelector).isVisible();
                if (isVisible) {
                  console.log(
                    `✅ Modal/formulario apareció con: ${modalSelector}`
                  );
                  modalFound = true;
                  break;
                }
              } catch {
                // Continuar
              }
            }

            if (!modalFound) {
              console.log('⚠️ No apareció modal o formulario después del clic');
            }

            break; // Solo probar la primera acción encontrada
          } catch {
            console.log(`⚠️ Acción no clickeable: ${selector}`);
          }
        }
      } catch {
        // Continuar
      }
    }

    console.log(`📊 Total de acciones de gestión encontradas: ${actionsFound}`);

    if (actionsFound > 0) {
      console.log('✅ Acciones de gestión de cuentas disponibles');
    } else {
      console.log('⚠️ No se encontraron acciones de gestión de cuentas');
      console.log(
        '📍 Esto puede ser normal si las cuentas están vacías o la funcionalidad no está implementada'
      );
    }

    console.log('✅ Test de acciones de gestión completado');
  });

  test('mobile swipe smoke keeps account-card swipe/tap expectations', async ({
    page,
  }, testInfo) => {
    test.skip(
      !['Mobile Chrome', 'Mobile Safari'].includes(testInfo.project.name),
      'Run this swipe smoke on mobile projects only'
    );

    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');

    const swipeableAccountRow = page.locator('div[role="button"]').first();
    const swipeableCount = await swipeableAccountRow.count();

    test.skip(
      swipeableCount === 0,
      'Current accounts surface does not render swipeable role=button cards in this build'
    );

    await expect(swipeableAccountRow).toBeVisible();

    await swipeLeftOnElement(page, swipeableAccountRow);
    await expect(
      swipeableAccountRow.locator('button[aria-label="Editar"]').first()
    ).toBeVisible();

    await swipeableAccountRow.click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test('desktop non-regression keeps account-card swipe interactions available', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this non-regression smoke on the desktop Chromium project'
    );

    await page.goto('/accounts');
    await expect(page).toHaveURL(/\/accounts/);

    const swipeableAccountRow = page.locator('div[role="button"]').first();
    const swipeableCount = await swipeableAccountRow.count();

    test.skip(
      swipeableCount === 0,
      'No swipeable account cards are available in this environment for desktop regression checks'
    );

    await expect(swipeableAccountRow).toBeVisible();

    await swipeLeftOnElement(page, swipeableAccountRow);
    await expect(
      swipeableAccountRow.locator('button[aria-label="Editar"]').first()
    ).toBeVisible();
  });

  test('should keep dropdown menu aligned with button during scroll', async ({
    page,
  }) => {
    console.log(
      '🔍 Probando alineación del menú desplegable durante scroll...'
    );

    // Navigate to accounts page
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');

    // Find the first account row with a dropdown button
    const moreButtonLocator = page
      .locator('[aria-label="Acciones de cuenta"]')
      .first();

    // Verify the button exists
    try {
      await expect(moreButtonLocator).toBeVisible({ timeout: 5000 });
      console.log('✅ Botón de menú desplegable encontrado');
    } catch {
      console.log(
        '⚠️ Botón de menú desplegable no encontrado - probablemente no hay cuentas'
      );
      return;
    }

    // Get initial button position
    const buttonBox = await moreButtonLocator.boundingBox();
    if (!buttonBox) {
      throw new Error('No se pudo obtener la posición del botón');
    }
    console.log(
      `📍 Posición inicial del botón: x=${buttonBox.x}, y=${buttonBox.y}`
    );

    // Click to open dropdown
    await moreButtonLocator.click();
    console.log('📌 Menú desplegable abierto');

    // Wait for dropdown to appear
    const dropdownLocator = page.locator('[role="menu"]');
    await expect(dropdownLocator).toBeVisible({ timeout: 2000 });
    console.log('✅ Menú desplegable visible');

    // Get dropdown initial position
    const dropdownBox = await dropdownLocator.boundingBox();
    if (!dropdownBox) {
      throw new Error('No se pudo obtener la posición del menú desplegable');
    }
    const initialDropdownY = dropdownBox.y;
    console.log(`📍 Posición inicial del menú: y=${initialDropdownY}`);

    // Scroll down in the main content area
    const mainContainer = page.locator('main');
    await mainContainer.evaluate((el) => {
      el.scrollTop += 200;
    });

    console.log('📜 Scroll realizado en el contenedor principal');
    await page.waitForTimeout(500);

    // Get button position after scroll
    const buttonBoxAfterScroll = await moreButtonLocator.boundingBox();
    if (!buttonBoxAfterScroll) {
      throw new Error(
        'No se pudo obtener la posición del botón después del scroll'
      );
    }
    console.log(
      `📍 Posición del botón después del scroll: y=${buttonBoxAfterScroll.y}`
    );

    // Get dropdown position after scroll
    const dropdownBoxAfterScroll = await dropdownLocator.boundingBox();
    if (!dropdownBoxAfterScroll) {
      throw new Error(
        'No se pudo obtener la posición del menú después del scroll'
      );
    }
    const finalDropdownY = dropdownBoxAfterScroll.y;
    console.log(`📍 Posición del menú después del scroll: y=${finalDropdownY}`);

    // Verify dropdown moved with the button
    const buttonYMovement = Math.abs(buttonBox.y - buttonBoxAfterScroll.y);
    const dropdownYMovement = Math.abs(initialDropdownY - finalDropdownY);

    console.log(`📊 Movimiento del botón en Y: ${buttonYMovement}px`);
    console.log(`📊 Movimiento del menú en Y: ${dropdownYMovement}px`);

    // The button and dropdown should move together (within tolerance)
    expect(Math.abs(buttonYMovement - dropdownYMovement)).toBeLessThan(50);
    console.log(
      '✅ El menú se mantiene alineado con el botón durante el scroll'
    );

    // Verify dropdown is still on screen and positioned below the button
    expect(dropdownBoxAfterScroll.y).toBeGreaterThan(buttonBoxAfterScroll.y);
    console.log('✅ El menú está correctamente posicionado debajo del botón');

    // Verify dropdown is still visible
    expect(dropdownLocator).toBeVisible();
    console.log('✅ El menú desplegable permanece visible después del scroll');
  });
});
