const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lssnujnctuchowgrspvk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzc251am5jdHVjaG93Z3JzcHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjIyOTQsImV4cCI6MjA3MDkzODI5NH0.C0_RjPLk5TvNaXp50Ir-hJpZniQs4E_wrlbmED-xMLM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 Verificando estructura de la tabla users...');
  
  try {
    // Intentar seleccionar todas las columnas
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error al consultar tabla:', error.message);
      
      // Intentar con columnas específicas
      const columns = ['id', 'email', 'name', 'full_name', 'created_at', 'updated_at'];
      
      for (const column of columns) {
        try {
          const { data: testData, error: testError } = await supabase
            .from('users')
            .select(column)
            .limit(1);
          
          if (!testError) {
            console.log(`✅ Columna '${column}' existe`);
          } else {
            console.log(`❌ Columna '${column}' no existe: ${testError.message}`);
          }
        } catch (err) {
          console.log(`❌ Error probando columna '${column}': ${err.message}`);
        }
      }
      
    } else {
      console.log('✅ Tabla accesible, estructura:');
      if (data && data.length > 0) {
        console.log('📋 Columnas encontradas:', Object.keys(data[0]));
      } else {
        console.log('📋 Tabla vacía, pero accesible');
        
        // Probar inserción con diferentes estructuras
        await testDifferentStructures();
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testDifferentStructures() {
  console.log('🧪 Probando diferentes estructuras de inserción...');
  
  const testStructures = [
    {
      name: 'Estructura con name',
      data: {
        id: 'test-123',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString()
      }
    },
    {
      name: 'Estructura con full_name',
      data: {
        id: 'test-124',
        email: 'test2@example.com',
        full_name: 'Test User 2',
        created_at: new Date().toISOString()
      }
    },
    {
      name: 'Estructura mínima',
      data: {
        id: 'test-125',
        email: 'test3@example.com'
      }
    }
  ];
  
  for (const test of testStructures) {
    try {
      console.log(`🔬 Probando: ${test.name}`);
      
      const { data, error } = await supabase
        .from('users')
        .insert([test.data]);
      
      if (error) {
        console.log(`❌ ${test.name} falló: ${error.message}`);
      } else {
        console.log(`✅ ${test.name} funcionó!`);
        
        // Limpiar
        await supabase
          .from('users')
          .delete()
          .eq('id', test.data.id);
        
        console.log(`🧹 ${test.name} limpiado`);
        break; // Si funciona, usar esta estructura
      }
    } catch (err) {
      console.log(`❌ ${test.name} error: ${err.message}`);
    }
  }
}

checkTableStructure().catch(console.error);
