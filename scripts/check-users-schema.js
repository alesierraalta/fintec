const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lssnujnctuchowgrspvk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzc251am5jdHVjaG93Z3JzcHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjIyOTQsImV4cCI6MjA3MDkzODI5NH0.C0_RjPLk5TvNaXp50Ir-hJpZniQs4E_wrlbmED-xMLM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsersSchema() {
  console.log('🔍 Checking users table schema...\n');

  try {
    // 1. Check if users table exists and get its structure
    console.log('1️⃣ Checking users table structure...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.log('❌ Error accessing users table:', usersError.message);
      console.log('💡 This suggests the table might not exist or have RLS issues');
      return;
    }

    if (users.length === 0) {
      console.log('✅ Users table exists but is empty');
      console.log('💡 We can try to insert a user to see the schema');
    } else {
      console.log('✅ Users table has data:', users.length, 'records');
      console.log('📋 Sample user structure:');
      console.log(JSON.stringify(users[0], null, 2));
    }

    // 2. Try to get the current user from auth
    console.log('\n2️⃣ Checking current auth user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else if (!user) {
      console.log('❌ No authenticated user found');
    } else {
      console.log('✅ Current user:', user.id);
      console.log('   Email:', user.email);
    }

    // 3. Try to insert a simple user record
    console.log('\n3️⃣ Testing user insertion...');
    const testUserId = 'test-user-' + Date.now();
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: 'test@test.com',
        created_at: new Date().toISOString()
      })
      .select();

    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('💡 This confirms there are RLS or schema issues');
    } else {
      console.log('✅ User inserted successfully:', insertData);
      
      // Clean up test record
      await supabase.from('users').delete().eq('id', testUserId);
      console.log('🧹 Test record cleaned up');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkUsersSchema();
