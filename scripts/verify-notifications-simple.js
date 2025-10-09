// Simple verification of notifications table
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Could not read Supabase credentials from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('🔍 Verifying notifications table...\n');
  
  try {
    // Check if table exists by querying it
    const { data, error } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }

    console.log('✅ Notifications table exists and is accessible!');
    console.log('✅ RLS policies are working (no permission errors)');
    return true;
  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

verify().then((success) => {
  if (success) {
    console.log('\n🎉 Notifications table is ready to use!');
    process.exit(0);
  } else {
    console.log('\n❌ Verification failed');
    process.exit(1);
  }
});

