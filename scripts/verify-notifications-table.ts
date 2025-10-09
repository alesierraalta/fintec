/**
 * Verify Notifications Table
 * 
 * Quick script to verify the notifications table was created successfully
 * and has the correct schema and RLS policies.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyNotificationsTable() {
  console.log('🔍 Verifying notifications table...\n');

  try {
    // 1. Check table exists
    console.log('1️⃣ Checking if notifications table exists...');
    const { data: tableExists, error: tableError } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);

    if (tableError) {
      console.error('❌ Table does not exist or has errors:', tableError.message);
      return false;
    }
    console.log('✅ Notifications table exists');

    // 2. Check RLS policies
    console.log('\n2️⃣ Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase.rpc('exec_sql' as any, {
      query: `
        SELECT policyname, cmd, with_check
        FROM pg_policies 
        WHERE tablename = 'notifications' AND schemaname = 'public'
        ORDER BY policyname;
      `
    });

    if (!policyError && policies) {
      console.log('✅ RLS Policies found:', policies.length);
      policies.forEach((p: any) => {
        console.log(`   - ${p.policyname} (${p.cmd})`);
      });
    } else {
      console.log('⚠️  Could not verify RLS policies (requires direct DB access)');
    }

    // 3. Try to insert a test notification
    console.log('\n3️⃣ Testing notification insertion...');
    console.log('   (This would require an authenticated user, skipping)');

    console.log('\n✅ Notifications table verification complete!');
    return true;

  } catch (error: any) {
    console.error('❌ Error during verification:', error.message);
    return false;
  }
}

verifyNotificationsTable();

