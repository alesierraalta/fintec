#!/usr/bin/env tsx

import { supabase } from '../repositories/supabase/client';

async function verifyMigration() {
  console.log('🔍 Verificando migración de suscripciones...\n');

  try {
    // 1. Verificar tabla subscriptions
    console.log('1. Verificando tabla "subscriptions"...');
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('count')
      .limit(1);
    
    if (subsError) {
      console.log('   ❌ No existe');
      console.log('   Error:', subsError.message);
    } else {
      console.log('   ✅ Existe');
    }

    // 2. Verificar tabla usage_tracking
    console.log('\n2. Verificando tabla "usage_tracking"...');
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('count')
      .limit(1);
    
    if (usageError) {
      console.log('   ❌ No existe');
      console.log('   Error:', usageError.message);
    } else {
      console.log('   ✅ Existe');
    }

    // 3. Verificar columnas en users
    console.log('\n3. Verificando columnas de subscription en "users"...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .limit(1);
    
    if (usersError) {
      console.log('   ❌ Columnas no existen');
      console.log('   Error:', usersError.message);
    } else {
      console.log('   ✅ Columnas existen');
    }

    // Resumen
    if (!subsError && !usageError && !usersError) {
      console.log('\n🎉 ¡MIGRACIÓN EXITOSA!');
      console.log('\n📋 Próximos pasos:');
      console.log('   1. Configurar productos en Stripe Dashboard');
      console.log('   2. Agregar variables de entorno (.env.local)');
      console.log('   3. Ejecutar: npx tsx scripts/migrate-subscriptions.ts');
      console.log('   4. Probar: npm run dev → http://localhost:3000/pricing');
    } else {
      console.log('\n⚠️  La migración aún no se ha aplicado completamente.');
      console.log('\nPor favor ejecuta el SQL desde el Dashboard de Supabase:');
      console.log('   scripts/migrations/001_add_subscription_schema.sql');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyMigration();

