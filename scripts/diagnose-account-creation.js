// Script de diagnóstico para el problema de creación de cuentas
// Ejecutar con: node scripts/diagnose-account-creation.js

console.log('🔍 Diagnóstico del problema de creación de cuentas\n');

// Simular el entorno del navegador para IndexedDB
if (typeof window === 'undefined') {
  console.log('❌ Este script debe ejecutarse en el navegador');
  console.log('📋 Para diagnosticar:');
  console.log('   1. Abrir DevTools (F12)');
  console.log('   2. Ir a Console');
  console.log('   3. Copiar y pegar el siguiente código:\n');
  
  console.log(`
// === CÓDIGO DE DIAGNÓSTICO PARA NAVEGADOR ===

(async function diagnoseAccountCreation() {
  console.log('🔍 Iniciando diagnóstico de creación de cuentas...');
  
  // 1. Verificar IndexedDB
  console.log('\n1. Verificando IndexedDB...');
  if (!window.indexedDB) {
    console.log('❌ IndexedDB no está disponible');
    return;
  }
  console.log('✅ IndexedDB disponible');
  
  // 2. Verificar base de datos FinanceDB
  console.log('\n2. Verificando base de datos FinanceDB...');
  try {
    const request = indexedDB.open('FinanceDB');
    request.onsuccess = function(event) {
      const db = event.target.result;
      console.log('✅ Base de datos FinanceDB existe');
      console.log('📊 Versión:', db.version);
      console.log('📋 Object stores:', Array.from(db.objectStoreNames));
      
      if (db.objectStoreNames.contains('accounts')) {
        console.log('✅ Tabla accounts existe');
      } else {
        console.log('❌ Tabla accounts no existe');
      }
      
      db.close();
    };
    request.onerror = function() {
      console.log('❌ Error al abrir base de datos:', request.error);
    };
  } catch (error) {
    console.log('❌ Error verificando base de datos:', error);
  }
  
  // 3. Probar creación directa de cuenta
  console.log('\n3. Probando creación directa de cuenta...');
  try {
    // Importar Dexie si está disponible
    if (typeof Dexie !== 'undefined') {
      const db = new Dexie('FinanceDB');
      db.version(1).stores({
        accounts: 'id, userId, name, type, currencyCode, balance, active, createdAt'
      });
      
      await db.open();
      
      const testAccount = {
        id: 'test-' + Date.now(),
        userId: 'local-user',
        name: 'Cuenta de Prueba Diagnóstico',
        type: 'CASH',
        currencyCode: 'USD',
        balance: 10000,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.accounts.add(testAccount);
      console.log('✅ Cuenta de prueba creada exitosamente');
      
      // Verificar que se guardó
      const saved = await db.accounts.get(testAccount.id);
      if (saved) {
        console.log('✅ Cuenta verificada en base de datos');
        console.log('📄 Datos:', saved);
        
        // Limpiar cuenta de prueba
        await db.accounts.delete(testAccount.id);
        console.log('🧹 Cuenta de prueba eliminada');
      } else {
        console.log('❌ Cuenta no encontrada después de crear');
      }
      
      db.close();
    } else {
      console.log('❌ Dexie no está disponible');
    }
  } catch (error) {
    console.log('❌ Error en prueba de creación:', error);
  }
  
  // 4. Verificar estado de autenticación
  console.log('\n4. Verificando estado de autenticación...');
  try {
    // Verificar si hay contexto de autenticación
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      console.log('📊 Datos de autenticación encontrados');
      console.log('👤 Usuario:', parsed.state?.user ? 'Presente' : 'Ausente');
    } else {
      console.log('⚠️ No hay datos de autenticación en localStorage');
    }
  } catch (error) {
    console.log('❌ Error verificando autenticación:', error);
  }
  
  // 5. Verificar repositorio
  console.log('\n5. Verificando configuración del repositorio...');
  try {
    // Verificar si el repositorio está configurado correctamente
    console.log('📋 Para verificar el repositorio:');
    console.log('   - Abrir Network tab en DevTools');
    console.log('   - Intentar crear una cuenta');
    console.log('   - Verificar si hay llamadas a /api/accounts');
    console.log('   - Si no hay llamadas, el problema está en el frontend');
    console.log('   - Si hay llamadas con error, el problema está en el backend');
  } catch (error) {
    console.log('❌ Error verificando repositorio:', error);
  }
  
  console.log('\n✅ Diagnóstico completado');
  console.log('📋 Revisa los puntos marcados con ❌ para identificar el problema');
})();

// === FIN DEL CÓDIGO DE DIAGNÓSTICO ===`);
  
  process.exit(0);
}

console.log('\n📋 Instrucciones:');
console.log('1. Abrir la aplicación en el navegador');
console.log('2. Abrir DevTools (F12)');
console.log('3. Ir a la pestaña Console');
console.log('4. Copiar y pegar el código de diagnóstico mostrado arriba');
console.log('5. Presionar Enter para ejecutar');
console.log('6. Revisar los resultados para identificar el problema\n');