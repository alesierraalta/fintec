const { createClient } = require('@supabase/supabase-js');

async function checkBrowserAuth() {
  console.log('🌐 Verificando estado de autenticación en el navegador...');
  
  const supabaseUrl = 'https://lssnujnctuchowgrspvk.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzc251am5jdHVjaG93Z3JzcHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjIyOTQsImV4cCI6MjA3MDkzODI5NH0.C0_RjPLk5TvNaXp50Ir-hJpZniQs4E_wrlbmED-xMLM';
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // 1. Verificar si hay sesión activa
    console.log('1️⃣ Verificando sesión activa...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Error al obtener sesión:', sessionError.message);
      return;
    }
    
    if (!session) {
      console.log('⚠️ No hay sesión activa');
      console.log('💡 El usuario necesita iniciar sesión para ver datos en los reportes');
      console.log('');
      console.log('🔧 PASOS PARA SOLUCIONAR:');
      console.log('1. Ve a http://localhost:3000/auth/login');
      console.log('2. Inicia sesión con tu cuenta');
      console.log('3. Luego ve a http://localhost:3000/reports');
      return;
    }
    
    console.log('✅ Sesión activa encontrada');
    console.log('👤 Usuario:', session.user.email);
    console.log('🆔 User ID:', session.user.id);
    
    // 2. Verificar datos del usuario
    console.log('\n2️⃣ Verificando datos del usuario...');
    
    // Verificar perfil del usuario
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.log('❌ Error al obtener perfil:', profileError.message);
    } else {
      console.log('✅ Perfil del usuario encontrado');
      console.log('📝 Nombre:', userProfile.name || 'No especificado');
      console.log('💰 Moneda base:', userProfile.base_currency || 'USD');
    }
    
    // Verificar cuentas
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', session.user.id);
    
    if (accountsError) {
      console.log('❌ Error al obtener cuentas:', accountsError.message);
    } else {
      console.log(`📊 Cuentas encontradas: ${accounts?.length || 0}`);
      if (accounts && accounts.length > 0) {
        accounts.forEach((account, index) => {
          console.log(`   ${index + 1}. ${account.name} - $${(account.balance / 100).toFixed(2)} (${account.currency_code})`);
        });
      } else {
        console.log('⚠️ No hay cuentas creadas');
        console.log('💡 El usuario debe crear cuentas para ver datos en los reportes');
      }
    }
    
    // Verificar transacciones
    const accountIds = accounts?.map(a => a.id) || [];
    let transactions = [];
    
    if (accountIds.length > 0) {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .in('account_id', accountIds);
      
      if (transactionsError) {
        console.log('❌ Error al obtener transacciones:', transactionsError.message);
      } else {
        transactions = transactionsData || [];
        console.log(`💰 Transacciones encontradas: ${transactions.length}`);
        
        if (transactions.length > 0) {
          const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount_base_minor, 0);
          const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount_base_minor, 0);
          console.log(`   - Ingresos totales: $${(income / 100).toFixed(2)}`);
          console.log(`   - Gastos totales: $${(expenses / 100).toFixed(2)}`);
          console.log(`   - Balance neto: $${((income - expenses) / 100).toFixed(2)}`);
        } else {
          console.log('⚠️ No hay transacciones registradas');
          console.log('💡 El usuario debe registrar transacciones para ver datos en los reportes');
        }
      }
    } else {
      console.log('⚠️ No se pueden obtener transacciones sin cuentas');
    }
    
    // 3. Diagnóstico final
    console.log('\n📋 DIAGNÓSTICO FINAL:');
    console.log('====================');
    
    if (!session) {
      console.log('❌ PROBLEMA: No hay sesión activa');
      console.log('💡 SOLUCIÓN: El usuario debe iniciar sesión');
    } else if (!accounts || accounts.length === 0) {
      console.log('❌ PROBLEMA: No hay cuentas creadas');
      console.log('💡 SOLUCIÓN: El usuario debe crear al menos una cuenta');
      console.log('🔗 Ir a: http://localhost:3000/accounts');
    } else if (!transactions || transactions.length === 0) {
      console.log('❌ PROBLEMA: No hay transacciones registradas');
      console.log('💡 SOLUCIÓN: El usuario debe registrar transacciones');
      console.log('🔗 Ir a: http://localhost:3000/transactions');
    } else {
      console.log('✅ DATOS ENCONTRADOS:');
      console.log(`   - Cuentas: ${accounts.length}`);
      console.log(`   - Transacciones: ${transactions.length}`);
      console.log('💡 Si aún se muestran $0 en los reportes, el problema está en el frontend');
      console.log('🔍 Revisar:');
      console.log('   - Consola del navegador para errores');
      console.log('   - Network tab para verificar llamadas a la API');
      console.log('   - Estado de los hooks useOptimizedData');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkBrowserAuth().then(() => {
    console.log('\n🎯 VERIFICACIÓN COMPLETADA');
  }).catch(console.error);
}

module.exports = { checkBrowserAuth };
