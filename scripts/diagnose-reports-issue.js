const { createClient } = require('@supabase/supabase-js');

async function diagnoseReportsIssue() {
  console.log('🔍 Diagnosticando problema de reportes...');
  
  // Usar las credenciales del .env.local
  const supabaseUrl = 'https://lssnujnctuchowgrspvk.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzc251am5jdHVjaG93Z3JzcHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjIyOTQsImV4cCI6MjA3MDkzODI5NH0.C0_RjPLk5TvNaXp50Ir-hJpZniQs4E_wrlbmED-xMLM';
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // 1. Verificar autenticación actual
    console.log('1️⃣ Verificando autenticación...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Error de autenticación:', authError.message);
      return;
    }
    
    if (!user) {
      console.log('⚠️ No hay usuario autenticado - esto explica por qué no se muestran datos');
      console.log('💡 Los reportes requieren autenticación para mostrar datos');
      return;
    }
    
    console.log('✅ Usuario autenticado:', user.email);
    console.log('🆔 User ID:', user.id);
    
    // 2. Verificar datos en tablas principales
    console.log('\n2️⃣ Verificando datos en tablas...');
    
    // Verificar cuentas
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id);
    
    if (accountsError) {
      console.log('❌ Error al obtener cuentas:', accountsError.message);
    } else {
      console.log(`📊 Cuentas encontradas: ${accounts?.length || 0}`);
      if (accounts && accounts.length > 0) {
        console.log('   - Cuentas:', accounts.map(a => `${a.name} (${a.balance})`).join(', '));
      }
    }
    
    // Verificar transacciones
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .in('account_id', accounts?.map(a => a.id) || []);
    
    if (transactionsError) {
      console.log('❌ Error al obtener transacciones:', transactionsError.message);
    } else {
      console.log(`💰 Transacciones encontradas: ${transactions?.length || 0}`);
      if (transactions && transactions.length > 0) {
        const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount_base_minor, 0);
        const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount_base_minor, 0);
        console.log(`   - Ingresos totales: $${(income / 100).toFixed(2)}`);
        console.log(`   - Gastos totales: $${(expenses / 100).toFixed(2)}`);
      }
    }
    
    // Verificar categorías
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');
    
    if (categoriesError) {
      console.log('❌ Error al obtener categorías:', categoriesError.message);
    } else {
      console.log(`🏷️ Categorías encontradas: ${categories?.length || 0}`);
    }
    
    // 3. Verificar políticas RLS
    console.log('\n3️⃣ Verificando políticas RLS...');
    
    // Intentar insertar una transacción de prueba
    if (accounts && accounts.length > 0) {
      const testTransaction = {
        account_id: accounts[0].id,
        category_id: categories?.[0]?.id || null,
        type: 'EXPENSE',
        amount_base_minor: 1000, // $10.00
        description: 'Test transaction',
        date: new Date().toISOString().split('T')[0],
        currency_code: 'USD'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('transactions')
        .insert([testTransaction])
        .select();
      
      if (insertError) {
        console.log('❌ Error al insertar transacción de prueba:', insertError.message);
        console.log('💡 Esto indica problemas de RLS en la tabla transactions');
      } else {
        console.log('✅ Transacción de prueba insertada correctamente');
        
        // Limpiar la transacción de prueba
        await supabase
          .from('transactions')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Transacción de prueba eliminada');
      }
    }
    
    // 4. Resumen del diagnóstico
    console.log('\n📋 RESUMEN DEL DIAGNÓSTICO:');
    console.log('========================');
    
    if (!user) {
      console.log('❌ PROBLEMA: No hay usuario autenticado');
      console.log('💡 SOLUCIÓN: El usuario debe iniciar sesión para ver datos');
    } else if (!accounts || accounts.length === 0) {
      console.log('❌ PROBLEMA: No hay cuentas creadas');
      console.log('💡 SOLUCIÓN: El usuario debe crear al menos una cuenta');
    } else if (!transactions || transactions.length === 0) {
      console.log('❌ PROBLEMA: No hay transacciones registradas');
      console.log('💡 SOLUCIÓN: El usuario debe registrar transacciones');
    } else {
      console.log('✅ DATOS ENCONTRADOS:');
      console.log(`   - Cuentas: ${accounts.length}`);
      console.log(`   - Transacciones: ${transactions.length}`);
      console.log(`   - Categorías: ${categories?.length || 0}`);
      console.log('💡 Si aún se muestran $0, el problema está en el frontend');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  diagnoseReportsIssue().then(() => {
    console.log('\n🎯 DIAGNÓSTICO COMPLETADO');
  }).catch(console.error);
}

module.exports = { diagnoseReportsIssue };
