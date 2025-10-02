const { createClient } = require('@supabase/supabase-js');

async function fixAuthPermissions() {
  console.log('🔧 Arreglando permisos de autenticación en Supabase...');
  
  // Usar las credenciales del .env.local
  const supabaseUrl = 'https://lssnujnctuchowgrspvk.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzc251am5jdHVjaG93Z3JzcHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjIyOTQsImV4cCI6MjA3MDkzODI5NH0.C0_RjPLk5TvNaXp50Ir-hJpZniQs4E_wrlbmED-xMLM';
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // 1. Verificar políticas actuales
    console.log('1️⃣ Verificando políticas actuales...');
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'users');
    
    if (policiesError) {
      console.log('⚠️ No se pudieron obtener las políticas (normal en cliente anónimo)');
    } else {
      console.log('📋 Políticas actuales para tabla users:');
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd}`);
      });
    }
    
    // 2. Intentar crear usuario de prueba para verificar el problema
    console.log('2️⃣ Probando registro de usuario...');
    
    const testEmail = `test-${Date.now()}@fintec.com`;
    const testPassword = 'Test123!';
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
    
    if (signupError) {
      console.log('❌ Error en signup:', signupError.message);
      return false;
    }
    
    console.log('✅ Usuario creado en Supabase Auth');
    console.log('📧 Email:', testEmail);
    console.log('🆔 User ID:', signupData.user?.id);
    
    if (signupData.user) {
      // 3. Intentar crear perfil en tabla users
      console.log('3️⃣ Intentando crear perfil en tabla users...');
      
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([{
          id: signupData.user.id,
          email: signupData.user.email,
          name: 'Test User',
          base_currency: 'USD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (profileError) {
        console.log('❌ Error al crear perfil:', profileError.message);
        console.log('🔍 Código de error:', profileError.code);
        console.log('💡 Esto confirma el problema de RLS');
        
        // 4. Proporcionar solución
        console.log('');
        console.log('🔧 SOLUCIÓN REQUERIDA:');
        console.log('');
        console.log('1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard');
        console.log('2. Ve a Authentication > Policies');
        console.log('3. Busca la tabla "users"');
        console.log('4. Agrega esta política:');
        console.log('');
        console.log('   CREATE POLICY "Users can insert own profile" ON users');
        console.log('   FOR INSERT WITH CHECK (auth.uid() = id);');
        console.log('');
        console.log('5. O ejecuta este SQL en el SQL Editor:');
        console.log('');
        console.log('   DROP POLICY IF EXISTS "Users can insert own profile" ON users;');
        console.log('   CREATE POLICY "Users can insert own profile" ON users');
        console.log('   FOR INSERT WITH CHECK (auth.uid() = id);');
        console.log('');
        
        return false;
      } else {
        console.log('✅ Perfil creado exitosamente!');
        console.log('📊 Datos del perfil:', profileData);
        return true;
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixAuthPermissions().then(success => {
    if (success) {
      console.log('');
      console.log('🎉 ¡Permisos arreglados! Ahora puedes ejecutar:');
      console.log('   npm run e2e -- --project=authenticated');
    } else {
      console.log('');
      console.log('⚠️ Necesitas arreglar las políticas de RLS manualmente en Supabase');
    }
  }).catch(console.error);
}

module.exports = { fixAuthPermissions };

