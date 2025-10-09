#!/usr/bin/env tsx

/**
 * Script para aplicar TODAS las migraciones al proyecto de desarrollo (fintecdev)
 * 
 * PREREQUISITOS:
 * 1. Proyecto fintecdev creado en Supabase Dashboard
 * 2. Variables de entorno configuradas en .env.local con credenciales de fintecdev
 * 
 * USO:
 * npx tsx scripts/apply-all-migrations-dev.ts
 */

import { createClient } from '@supabase/supabase-js';

// Verificar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.log('\nAsegúrate de tener en .env.local:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...');
  process.exit(1);
}

console.log('\n📋 Proyecto detectado:', supabaseUrl);
console.log('⚠️  IMPORTANTE: Esto aplicará TODAS las migraciones a este proyecto\n');

// Crear cliente de Supabase con service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Definir todas las migraciones en orden
const migrations = [
  {
    name: 'initial_schema_setup',
    description: 'Tablas base (users, accounts, transactions, etc.)',
    sql: `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table
CREATE TABLE accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CASH', 'BANK', 'CARD', 'INVESTMENT', 'SAVINGS')),
  currency_code TEXT NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER_OUT', 'TRANSFER_IN')),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  currency_code TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  amount_base_minor BIGINT NOT NULL,
  exchange_rate DECIMAL(10, 6) NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  description TEXT,
  note TEXT,
  tags TEXT[],
  transfer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfers table
CREATE TABLE transfers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  to_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  fee_minor BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  amount_base_minor BIGINT NOT NULL,
  spent_base_minor BIGINT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, month_year)
);

-- Goals table
CREATE TABLE goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_base_minor BIGINT NOT NULL,
  current_base_minor BIGINT NOT NULL DEFAULT 0,
  target_date DATE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`
  },
  // Las demás migraciones se cargarían desde los archivos SQL
  // Por ahora, incluyo las instrucciones para el usuario
];

async function applyMigration(name: string, sql: string, description: string) {
  console.log(`\n📝 Aplicando: ${name}`);
  console.log(`   ${description}`);
  
  try {
    // Nota: La API de Supabase no permite ejecutar SQL DDL directamente desde el cliente
    // Este script debe ejecutarse manualmente via SQL Editor o Supabase CLI
    console.log(`   ⚠️  Esta migración debe aplicarse manualmente`);
    return false;
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  APLICACIÓN DE MIGRACIONES A DESARROLLO (fintecdev)      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('⚠️  IMPORTANTE:');
  console.log('   Debido a limitaciones de Supabase Client API, las migraciones DDL');
  console.log('   deben aplicarse manualmente via Supabase Dashboard SQL Editor.\n');
  
  console.log('📋 INSTRUCCIONES:\n');
  console.log('1. Ve a Supabase Dashboard de fintecdev');
  console.log('2. Abre SQL Editor');
  console.log('3. Ejecuta cada migración en orden:\n');
  
  const migrationFiles = [
    '001_initial_schema_setup.sql',
    '002_indexes_and_security.sql',
    '003_functions_triggers_defaults.sql',
    '004_exchange_rates_table.sql',
    '005_recurring_transactions_table.sql',
    '006_recurring_transactions_functions.sql',
    '007_subscription_system_part1.sql',
    '008_subscription_system_part2.sql',
    '009_enable_rls_and_policies.sql',
    '010_fix_categories_rls.sql',
  ];

  migrationFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. Copiar contenido de scripts/migrations/${file}`);
    console.log(`      Ejecutar en SQL Editor`);
    console.log(`      Verificar que no hay errores\n`);
  });

  console.log('\n💡 ALTERNATIVA MÁS FÁCIL:');
  console.log('   Usa Supabase MCP para aplicar migraciones programáticamente');
  console.log('   (requiere configuración previa del MCP)\n');

  console.log('✅ Verificación final:');
  console.log('   npx tsx scripts/verify-supabase-setup.ts\n');
}

main();


