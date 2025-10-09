#!/usr/bin/env tsx

/**
 * Script para aplicar la migración de subscripciones
 * Usa la configuración de Supabase existente en el proyecto
 */

import { supabase } from '../repositories/supabase/client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  console.log('🚀 Aplicando migración de sistema de suscripciones...\n');

  try {
    // Leer el archivo SQL
    const sqlPath = join(__dirname, 'migrations', '001_add_subscription_schema.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    console.log('📝 Archivo de migración cargado');
    console.log('⚠️  IMPORTANTE: Esta migración debe ejecutarse en el SQL Editor de Supabase\n');
    
    console.log('Por favor sigue estos pasos:\n');
    console.log('1. Ve a tu Dashboard de Supabase: https://supabase.com/dashboard');
    console.log('2. Selecciona tu proyecto');
    console.log('3. Ve a SQL Editor en el menú lateral');
    console.log('4. Copia y pega el contenido del archivo:');
    console.log('   scripts/migrations/001_add_subscription_schema.sql');
    console.log('5. Ejecuta el SQL (Run o Ctrl+Enter)\n');

    console.log('Alternativamente, si tienes Supabase CLI instalado:');
    console.log('  supabase db push\n');

    // Intentar verificar la conexión
    console.log('🔍 Verificando conexión con Supabase...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Error de conexión:', error.message);
      console.log('\nAsegúrate de que tus variables de entorno estén configuradas correctamente.');
      process.exit(1);
    }

    console.log('✅ Conexión con Supabase verificada\n');

    // Verificar si las tablas ya existen
    console.log('🔍 Verificando si ya se aplicó la migración...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('subscriptions')
      .select('count')
      .limit(1);

    if (!tablesError) {
      console.log('✅ La tabla "subscriptions" ya existe.');
      console.log('⚠️  Parece que la migración ya fue aplicada.\n');
      
      // Verificar usage_tracking
      const { error: usageError } = await supabase
        .from('usage_tracking')
        .select('count')
        .limit(1);
      
      if (!usageError) {
        console.log('✅ La tabla "usage_tracking" también existe.');
        console.log('\n🎉 El sistema de suscripciones ya está configurado en la base de datos!');
        console.log('\nPróximos pasos:');
        console.log('1. Configurar productos en Stripe');
        console.log('2. Agregar variables de entorno');
        console.log('3. Ejecutar: npm run tsx scripts/migrate-subscriptions.ts');
        process.exit(0);
      }
    }

    console.log('⚠️  Las tablas de suscripción no existen todavía.');
    console.log('\n📋 Contenido del SQL a ejecutar:');
    console.log('─'.repeat(80));
    console.log(sqlContent.substring(0, 500) + '...\n(archivo completo en scripts/migrations/)');
    console.log('─'.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

applyMigration();

