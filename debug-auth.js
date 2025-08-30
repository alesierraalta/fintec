// Script de diagnóstico para el problema de autenticación
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Diagnóstico del problema de autenticación\n');

// 1. Verificar variables de entorno
console.log('1. Verificando variables de entorno:');
console.log('   SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ No configurada');
console.log('   SUPABASE_KEY:', supabaseKey ? '✅ Configurada' : '❌ No configurada');

// 2. Verificar archivos de configuración
console.log('\n2. Verificando archivos de configuración:');
const envFiles = ['.env.local', '.env', '.env.development'];
envFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${file}: ${exists ? '✅ Existe' : '❌ No existe'}`);
});

// 3. Verificar repositorio actual
console.log('\n3. Verificando configuración del repositorio:');
try {
  const repoProviderPath = path.join(__dirname, 'providers', 'repository-provider.tsx');
  const repoContent = fs.readFileSync(repoProviderPath, 'utf8');
  
  if (repoContent.includes('LocalAppRepository')) {
    console.log('   ✅ Usando LocalAppRepository');
  } else if (repoContent.includes('SupabaseAppRepository')) {
    console.log('   ✅ Usando SupabaseAppRepository');
  } else {
    console.log('   ❓ Repositorio no identificado');
  }
} catch (error) {
  console.log('   ❌ Error leyendo configuración del repositorio:', error.message);
}

// 4. Verificar base de datos local
console.log('\n4. Verificando base de datos local (IndexedDB):');
console.log('   ℹ️  Para verificar IndexedDB, abrir DevTools > Application > Storage > IndexedDB');

// 5. Simular problema de usuario
console.log('\n5. Simulando problema de usuario nulo:');
console.log('   ⚠️  Si el usuario de Supabase es null pero se usa repositorio local,');
console.log('      findByUserId(null) causará el error "Error al cargar las cuentas"');

// 6. Recomendaciones
console.log('\n📋 Recomendaciones para solucionar:');
console.log('   1. Implementar usuario por defecto para repositorio local');
console.log('   2. Agregar validación de usuario antes de llamar findByUserId');
console.log('   3. Mostrar mensaje específico cuando no hay usuario autenticado');
console.log('   4. Considerar migrar completamente a Supabase o usar solo local');

console.log('\n✅ Diagnóstico completado. Revisa los puntos marcados con ❌');