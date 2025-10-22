const { chromium } = require('playwright');
const readline = require('readline');

async function manualAuthSetup() {
  console.log('🔧 CONFIGURACIÓN MANUAL DE AUTENTICACIÓN');
  console.log('');
  console.log('📋 INSTRUCCIONES:');
  console.log('1. Se abrirá el navegador automáticamente');
  console.log('2. Ve a http://localhost:3000/auth/register');
  console.log('3. Crea un usuario con estos datos:');
  console.log('   📧 Email: test@fintec.com');
  console.log('   🔑 Password: Test123!');
  console.log('   👤 Nombre: Usuario Test');
  console.log('4. Si el registro falla (se queda en /auth/register),');
  console.log('   ve a /auth/login e inicia sesión con las mismas credenciales');
  console.log('5. Una vez que estés en el dashboard (página principal),');
  console.log('   presiona ENTER aquí');
  console.log('6. La sesión se guardará automáticamente');
  console.log('');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Abrir la aplicación
    console.log('🌐 Abriendo aplicación...');
    await page.goto('http://localhost:3000');
    
    console.log('⏳ Esperando que completes el registro/login manual...');
    console.log('📍 Ve a: http://localhost:3000/auth/register');
    console.log('👤 Crea usuario: test@fintec.com / Test123!');
    console.log('');
    
    // Esperar input del usuario
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise((resolve) => {
      rl.question('✅ Presiona ENTER cuando estés autenticado y en el dashboard: ', () => {
        rl.close();
        resolve();
      });
    });
    
    // Verificar si estamos autenticados
    const currentUrl = page.url();
    console.log('📍 URL actual:', currentUrl);
    
    // Verificar que no estamos en páginas de auth
    if (currentUrl.includes('/auth/')) {
      console.log('⚠️ Aún estás en una página de autenticación');
      console.log('💡 Por favor, completa el login y ve al dashboard');
      
      // Esperar un poco más
      await new Promise((resolve) => {
        const rl2 = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rl2.question('✅ Presiona ENTER cuando estés en el dashboard: ', () => {
          rl2.close();
          resolve();
        });
      });
    }
    
    // Refrescar para verificar el estado
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const finalUrl = page.url();
    console.log('📍 URL final:', finalUrl);
    
    // Guardar estado de autenticación
    console.log('💾 Guardando estado de autenticación...');
    await context.storageState({ path: 'playwright/.auth/user.json' });
    
    // Verificar que se guardó correctamente
    const fs = require('fs');
    if (fs.existsSync('playwright/.auth/user.json')) {
      const authData = fs.readFileSync('playwright/.auth/user.json', 'utf8');
      const parsed = JSON.parse(authData);
      
      console.log('📊 Estado guardado:');
      console.log('   🍪 Cookies:', parsed.cookies?.length || 0);
      console.log('   🌐 Origins:', parsed.origins?.length || 0);
      
      if (parsed.cookies && parsed.cookies.length > 0) {
        console.log('');
        console.log('🎉 ¡AUTENTICACIÓN CONFIGURADA EXITOSAMENTE!');
        console.log('');
        console.log('📧 Usuario: test@fintec.com');
        console.log('🔑 Password: Test123!');
        console.log('');
        console.log('🚀 Ahora puedes ejecutar:');
        console.log('   npm run e2e -- --project=authenticated');
        console.log('');
        
        return true;
      } else {
        console.log('⚠️ Se guardó el archivo pero no contiene cookies');
        console.log('💡 Esto puede funcionar de todas formas');
        return true;
      }
    } else {
      console.log('❌ No se pudo guardar el archivo de autenticación');
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
  manualAuthSetup().then(success => {
    if (success) {
      console.log('✅ Configuración completada!');
    } else {
      console.log('');
      console.log('💡 ALTERNATIVA RÁPIDA:');
      console.log('1. Ve a http://localhost:3000/auth/register');
      console.log('2. Crea usuario: test@fintec.com / Test123!');
      console.log('3. Si falla, ve a /auth/login e inicia sesión');
      console.log('4. Ejecuta: npm run e2e');
      console.log('   (Playwright intentará autenticarse automáticamente)');
    }
  }).catch(console.error);
}

module.exports = { manualAuthSetup };
