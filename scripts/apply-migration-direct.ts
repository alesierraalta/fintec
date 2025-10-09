#!/usr/bin/env tsx

/**
 * Aplica la migración de suscripciones directamente a Supabase
 * Ejecuta cada statement SQL uno por uno
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cargar variables de entorno
config({ path: '.env.local' });
config(); // Cargar .env como fallback

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSql(sql: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // Intenta ejecutar directamente si la función no existe
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        return { success: false, error: error || 'Failed to execute' };
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

async function applyMigration() {
  console.log('🚀 Aplicando migración de suscripciones...\n');

  try {
    const sqlPath = join(__dirname, 'migrations', '001_add_subscription_schema.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    // Dividir en statements individuales
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        // Filtrar comentarios y líneas vacías
        if (!s || s.length === 0) return false;
        if (s.startsWith('--')) return false;
        if (s.match(/^\/\*/)) return false;
        return true;
      });

    console.log(`📝 Encontrados ${statements.length} statements SQL\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');
      
      console.log(`[${i + 1}/${statements.length}] Ejecutando: ${preview}...`);

      const result = await executeSql(statement);

      if (result.success) {
        console.log(`   ✅ Exitoso`);
        successCount++;
      } else {
        console.log(`   ⚠️  Error (puede ser normal si ya existe):`, result.error?.message || result.error);
        errorCount++;
      }

      // Pequeña pausa entre statements
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ⚠️  Errores: ${errorCount}`);

    if (successCount > 0) {
      console.log('\n🎉 Migración aplicada!');
      console.log('\nVerificando tablas...');
      
      // Verificar que las tablas existen
      const { error: subError } = await supabase.from('subscriptions').select('count').limit(0);
      const { error: usageError } = await supabase.from('usage_tracking').select('count').limit(0);

      if (!subError && !usageError) {
        console.log('✅ Tablas "subscriptions" y "usage_tracking" creadas exitosamente!');
        console.log('\n📋 Próximos pasos:');
        console.log('1. Ejecuta: npx tsx scripts/verify-migration.ts');
        console.log('2. Configura Stripe productos');
        console.log('3. Ejecuta: npx tsx scripts/migrate-subscriptions.ts');
      }
    }

  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    process.exit(1);
  }
}

applyMigration();

