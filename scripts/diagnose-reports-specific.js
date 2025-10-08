const { createClient } = require('@supabase/supabase-js');

async function diagnoseReportsSpecific() {
  console.log('🔍 Diagnosticando problema específico de reportes...');
  
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
      console.log('⚠️ No hay sesión activa - esto explicaría por qué TODAS las páginas muestran datos vacíos');
      console.log('💡 Pero si otras páginas funcionan, entonces el problema es específico de los reportes');
      return;
    }
    
    console.log('✅ Sesión activa encontrada');
    console.log('👤 Usuario:', session.user.email);
    
    // 2. Simular exactamente lo que hace el hook useOptimizedData
    console.log('\n2️⃣ Simulando hook useOptimizedData...');
    
    // Cargar transacciones como lo hace el hook
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', session.user.id);
    
    if (!accounts || accounts.length === 0) {
      console.log('⚠️ No hay cuentas - esto explicaría por qué no hay datos');
      return;
    }
    
    const accountIds = accounts.map(acc => acc.id);
    
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .in('account_id', accountIds)
      .order('date', { ascending: false });
    
    if (transactionsError) {
      console.log('❌ Error al obtener transacciones:', transactionsError.message);
      return;
    }
    
    console.log(`📊 Transacciones encontradas: ${transactions?.length || 0}`);
    
    if (transactions && transactions.length > 0) {
      // 3. Simular cálculos de métricas como en los reportes
      console.log('\n3️⃣ Simulando cálculos de métricas...');
      
      const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount_base_minor, 0);
      const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount_base_minor, 0);
      const savings = income - expenses;
      const savingsRate = income > 0 ? (savings / income) * 100 : 0;
      
      console.log(`💰 Ingresos: $${(income / 100).toFixed(2)}`);
      console.log(`💸 Gastos: $${(expenses / 100).toFixed(2)}`);
      console.log(`💎 Ahorros: $${(savings / 100).toFixed(2)}`);
      console.log(`📈 Tasa de ahorro: ${savingsRate.toFixed(1)}%`);
      
      // 4. Verificar si los datos se están procesando correctamente
      console.log('\n4️⃣ Verificando procesamiento de datos...');
      
      const currentMetrics = {
        income: income / 100,
        expenses: expenses / 100,
        savings: savings / 100,
        savingsRate: savingsRate,
        totalTransactions: transactions.length,
        avgTransactionAmount: transactions.length > 0 ? 
          transactions.reduce((sum, t) => sum + Math.abs(t.amount_base_minor), 0) / transactions.length / 100 : 0
      };
      
      console.log('📊 Métricas calculadas:');
      console.log(`   - Ingresos: $${currentMetrics.income.toFixed(2)}`);
      console.log(`   - Gastos: $${currentMetrics.expenses.toFixed(2)}`);
      console.log(`   - Ahorros: $${currentMetrics.savings.toFixed(2)}`);
      console.log(`   - Tasa de ahorro: ${currentMetrics.savingsRate.toFixed(1)}%`);
      console.log(`   - Total transacciones: ${currentMetrics.totalTransactions}`);
      console.log(`   - Promedio por transacción: $${currentMetrics.avgTransactionAmount.toFixed(2)}`);
      
      // 5. Verificar si hay datos pero se muestran como $0
      if (currentMetrics.income > 0 || currentMetrics.expenses > 0) {
        console.log('\n✅ DATOS ENCONTRADOS Y PROCESADOS CORRECTAMENTE');
        console.log('💡 Si los reportes muestran $0, el problema está en el frontend');
        console.log('🔍 Posibles causas:');
        console.log('   - Error en el componente de reportes');
        console.log('   - Problema con el hook useOptimizedData');
        console.log('   - Error en el cálculo de métricas en el frontend');
        console.log('   - Problema con el caché');
      } else {
        console.log('\n⚠️ NO HAY DATOS REALES EN LA BASE DE DATOS');
        console.log('💡 Esto explicaría por qué se muestran $0');
      }
      
    } else {
      console.log('\n⚠️ NO HAY TRANSACCIONES EN LA BASE DE DATOS');
      console.log('💡 Esto explicaría por qué se muestran $0');
    }
    
    // 6. Verificar otras páginas para comparar
    console.log('\n6️⃣ Verificando si otras páginas funcionan...');
    console.log('💡 Si el dashboard, transacciones, cuentas funcionan pero los reportes no,');
    console.log('   entonces el problema está específicamente en la implementación de reportes');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  diagnoseReportsSpecific().then(() => {
    console.log('\n🎯 DIAGNÓSTICO ESPECÍFICO COMPLETADO');
  }).catch(console.error);
}

module.exports = { diagnoseReportsSpecific };
