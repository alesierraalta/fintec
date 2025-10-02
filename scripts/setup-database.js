const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lssnujnctuchowgrspvk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzc251am5jdHVjaG93Z3JzcHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjIyOTQsImV4cCI6MjA3MDkzODI5NH0.C0_RjPLk5TvNaXp50Ir-hJpZniQs4E_wrlbmED-xMLM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🔧 Configurando base de datos...');
  
  try {
    // Verificar si la tabla users existe
    console.log('🔍 Verificando tabla users...');
    const { data: usersCheck, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Tabla users no existe o tiene problemas:', usersError.message);
      console.log('💡 Necesitamos crear la tabla users manualmente en Supabase');
      
      // Intentar crear la tabla usando SQL
      const createUsersTableSQL = `
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID REFERENCES auth.users(id) PRIMARY KEY,
          email TEXT NOT NULL,
          full_name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Habilitar RLS
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        -- Políticas RLS
        CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
        CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
      `;
      
      console.log('📝 SQL para crear tabla users:');
      console.log(createUsersTableSQL);
      console.log('');
      console.log('💡 Copia y pega este SQL en el editor SQL de Supabase:');
      console.log('   https://supabase.com/dashboard/project/lssnujnctuchowgrspvk/sql');
      
      return false;
    } else {
      console.log('✅ Tabla users existe');
      
      // Verificar estructura de la tabla
      const { data: sampleUser, error: sampleError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.log('❌ Error al consultar tabla users:', sampleError.message);
        return false;
      }
      
      console.log('✅ Tabla users accesible');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testUserCreation() {
  console.log('🧪 Probando creación de usuario...');
  
  try {
    // Intentar crear un usuario de prueba
    const testUser = {
      id: 'test-user-id-123',
      email: 'test@example.com',
      full_name: 'Test User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([testUser]);
    
    if (error) {
      console.log('❌ Error al crear usuario de prueba:', error.message);
      console.log('📋 Detalles del error:', error);
      return false;
    } else {
      console.log('✅ Usuario de prueba creado exitosamente');
      
      // Limpiar usuario de prueba
      await supabase
        .from('users')
        .delete()
        .eq('id', testUser.id);
      
      console.log('🧹 Usuario de prueba eliminado');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
    return false;
  }
}

async function main() {
  const dbSetup = await setupDatabase();
  
  if (dbSetup) {
    const userTest = await testUserCreation();
    
    if (userTest) {
      console.log('');
      console.log('🎉 ¡Base de datos configurada correctamente!');
      console.log('✅ Ahora puedes ejecutar los tests de autenticación');
    } else {
      console.log('');
      console.log('❌ Hay problemas con la tabla users');
      console.log('💡 Revisa la estructura de la tabla en Supabase');
    }
  }
}

main().catch(console.error);
