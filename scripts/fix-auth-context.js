const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = 'https://lssnujnctuchowgrspvk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzc251am5jdHVjaG93Z3JzcHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjIyOTQsImV4cCI6MjA3MDkzODI5NH0.C0_RjPLk5TvNaXp50Ir-hJpZniQs4E_wrlbmED-xMLM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCorrectStructure() {
  console.log('🔧 Probando estructura correcta de la tabla users...');
  
  try {
    // Primero, verificar qué columnas existen realmente
    console.log('🔍 Verificando columnas disponibles...');
    
    // Probar con diferentes nombres de columnas para el nombre
    const nameColumns = ['name', 'full_name', 'display_name', 'username'];
    
    for (const nameCol of nameColumns) {
      try {
        const testId = uuidv4();
        const testUser = {
          id: testId,
          email: `test-${Date.now()}@example.com`,
          [nameCol]: 'Test User'
        };
        
        console.log(`🔬 Probando columna '${nameCol}'...`);
        
        const { data, error } = await supabase
          .from('users')
          .insert([testUser]);
        
        if (!error) {
          console.log(`✅ ¡Columna correcta encontrada: '${nameCol}'!`);
          
          // Limpiar
          await supabase
            .from('users')
            .delete()
            .eq('id', testId);
          
          console.log('🧹 Usuario de prueba eliminado');
          
          // Actualizar el contexto de autenticación
          await updateAuthContext(nameCol);
          
          return true;
        } else {
          console.log(`❌ '${nameCol}' falló: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ Error con '${nameCol}': ${err.message}`);
      }
    }
    
    console.log('❌ No se encontró la columna correcta para el nombre');
    return false;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function updateAuthContext(correctNameColumn) {
  console.log(`🔧 Actualizando contexto de autenticación para usar '${correctNameColumn}'...`);
  
  const authContextFile = 'contexts/auth-context.tsx';
  const fs = require('fs');
  
  try {
    let content = fs.readFileSync(authContextFile, 'utf8');
    
    // Reemplazar full_name con la columna correcta
    const oldPattern = /full_name:/g;
    const newPattern = `${correctNameColumn}:`;
    
    content = content.replace(oldPattern, newPattern);
    
    // También reemplazar en el objeto de datos
    const oldDataPattern = /full_name: userData\?\.full_name \|\| ''/g;
    const newDataPattern = `${correctNameColumn}: userData?.${correctNameColumn} || ''`;
    
    content = content.replace(oldDataPattern, newDataPattern);
    
    fs.writeFileSync(authContextFile, content);
    
    console.log(`✅ Contexto de autenticación actualizado para usar '${correctNameColumn}'`);
    console.log('🔄 Reinicia el servidor para aplicar los cambios');
    
  } catch (error) {
    console.error('❌ Error actualizando contexto:', error.message);
  }
}

async function createCorrectUser() {
  console.log('👤 Creando usuario de prueba con estructura correcta...');
  
  try {
    // Usar Supabase Auth para crear el usuario real
    const testEmail = `test-${Date.now()}@fintec.com`;
    const testPassword = 'Test123!';
    
    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Password: ${testPassword}`);
    
    // Registrar usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
    
    if (authError) {
      console.log('❌ Error en Supabase Auth:', authError.message);
      return false;
    }
    
    console.log('✅ Usuario creado en Supabase Auth');
    console.log('🆔 User ID:', authData.user?.id);
    
    // Ahora intentar crear el perfil en la tabla users
    if (authData.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: authData.user.email,
          name: 'Test User', // Usar 'name' en lugar de 'full_name'
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      
      if (profileError) {
        console.log('❌ Error creando perfil:', profileError.message);
        
        // Intentar con 'full_name'
        const { data: profileData2, error: profileError2 } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email: authData.user.email,
            full_name: 'Test User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (profileError2) {
          console.log('❌ Error con full_name también:', profileError2.message);
          return false;
        } else {
          console.log('✅ Perfil creado con full_name');
        }
      } else {
        console.log('✅ Perfil creado con name');
      }
    }
    
    console.log('🎉 ¡Usuario de prueba creado exitosamente!');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando corrección de autenticación...');
  
  // Primero probar la estructura correcta
  const structureOk = await testCorrectStructure();
  
  if (!structureOk) {
    // Si no funciona, crear usuario directamente
    console.log('🔄 Intentando crear usuario directamente...');
    await createCorrectUser();
  }
  
  console.log('');
  console.log('✅ Proceso completado');
  console.log('💡 Ahora ejecuta: npm run e2e -- --project=authenticated');
}

main().catch(console.error);
