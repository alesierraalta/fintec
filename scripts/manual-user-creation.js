const { chromium } = require('playwright');

async function manualUserCreation() {
  console.log('👤 Creación manual de usuario de prueba...');
  console.log('');
  console.log('📋 INSTRUCCIONES:');
  console.log('1. Se abrirá el navegador automáticamente');
  console.log('2. Ve a http://localhost:3000/auth/register');
  console.log('3. Crea un usuario con estos datos:');
  console.log('   📧 Email: test@fintec.com');
  console.log('   🔑 Password: Test123!');
  console.log('   👤 Nombre: Usuario Test');
  console.log('4. Una vez registrado, presiona ENTER aquí');
  console.log('5. La sesión se guardará automáticamente');
  console.log('');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🌐 Abriendo navegador...');
    await page.goto('http://localhost:3000');
    
    console.log('⏳ Esperando que completes el registro manual...');
    console.log('📍 Ve a: http://localhost:3000/auth/register');
    console.log('👤 Crea usuario: test@fintec.com / Test123!');
    console.log('');
    
    // Esperar input del usuario
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise((resolve) => {
      rl.question('✅ Presiona ENTER cuando hayas completado el registro: ', () => {
        rl.close();
        resolve();
      });
    });
    
    // Verificar si estamos autenticados
    const currentUrl = page.url();
    console.log('📍 URL actual:', currentUrl);
    
    if (currentUrl.includes('/auth/')) {
      console.log('⚠️ Parece que no estás autenticado. Verificando...');
      
      // Refrescar la página
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const refreshedUrl = page.url();
      console.log('📍 URL después del refresh:', refreshedUrl);
      
      if (refreshedUrl.includes('/auth/')) {
        console.log('❌ No se detectó autenticación');
        console.log('💡 Asegúrate de estar logueado y vuelve a ejecutar el script');
        return false;
      }
    }
    
    // Guardar estado de autenticación
    console.log('💾 Guardando estado de autenticación...');
    await context.storageState({ path: 'playwright/.auth/user.json' });
    
    // Verificar que se guardó
    const fs = require('fs');
    if (fs.existsSync('playwright/.auth/user.json')) {
      const authData = fs.readFileSync('playwright/.auth/user.json', 'utf8');
      const parsed = JSON.parse(authData);
      
      if (parsed.cookies && parsed.cookies.length > 0) {
        console.log('✅ Estado de autenticación guardado exitosamente!');
        console.log('🍪 Cookies guardadas:', parsed.cookies.length);
        
        console.log('');
        console.log('🎉 ¡AUTENTICACIÓN CONFIGURADA!');
        console.log('');
        console.log('📧 Usuario: test@fintec.com');
        console.log('🔑 Password: Test123!');
        console.log('');
        console.log('🚀 Ahora puedes ejecutar:');
        console.log('   npm run e2e -- --project=authenticated');
        console.log('');
        
        return true;
      } else {
        console.log('⚠️ El archivo se guardó pero no contiene cookies');
        return false;
      }
    } else {
      console.log('❌ No se pudo guardar el archivo');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  manualUserCreation().then(success => {
    if (!success) {
      console.log('');
      console.log('💡 ALTERNATIVA:');
      console.log('1. Ve a http://localhost:3000/auth/register');
      console.log('2. Crea usuario: test@fintec.com / Test123!');
      console.log('3. Ejecuta: npm run e2e -- --project=authenticated');
    }
  }).catch(console.error);
}

module.exports = { manualUserCreation };
