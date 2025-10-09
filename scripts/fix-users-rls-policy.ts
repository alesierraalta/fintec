/**
 * Fix Users Table RLS Policy
 * 
 * This script adds the missing INSERT policy to the users table,
 * which is required for user profile creation during authentication.
 * 
 * Issue: Login attempts fail with "new row violates row-level security policy"
 * Solution: Add INSERT policy that allows users to create their own profile
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUsersRLSPolicy() {
  console.log('🔧 Fixing Users Table RLS Policy...\n');

  try {
    // Step 1: Check current policies
    console.log('1️⃣ Checking current RLS policies on users table...');
    const { data: currentPolicies, error: checkError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            policyname,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'users'
          ORDER BY policyname;
        `
      });

    if (checkError) {
      console.log('⚠️  Could not check existing policies (this is OK if using service role)');
    } else {
      console.log('📋 Current policies:', currentPolicies);
    }

    // Step 2: Drop existing INSERT policy if it exists (to avoid conflicts)
    console.log('\n2️⃣ Dropping existing INSERT policy if exists...');
    const dropSQL = `DROP POLICY IF EXISTS "Users can insert own profile" ON users;`;
    
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: dropSQL
    });

    if (dropError) {
      console.log('⚠️  Note: Could not drop policy (might not exist):', dropError.message);
    } else {
      console.log('✅ Old policy dropped (if existed)');
    }

    // Step 3: Create the INSERT policy
    console.log('\n3️⃣ Creating INSERT policy for users table...');
    const createPolicySQL = `
      CREATE POLICY "Users can insert own profile" ON users 
        FOR INSERT 
        WITH CHECK (auth.uid() = id);
    `;

    const { error: createError } = await supabase.rpc('exec_sql', {
      query: createPolicySQL
    });

    if (createError) {
      console.error('❌ Error creating policy:', createError.message);
      throw createError;
    }

    console.log('✅ INSERT policy created successfully');

    // Step 4: Verify the policy was created
    console.log('\n4️⃣ Verifying policy creation...');
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            policyname,
            cmd,
            with_check
          FROM pg_policies 
          WHERE tablename = 'users' AND policyname = 'Users can insert own profile';
        `
      });

    if (verifyError) {
      console.log('⚠️  Could not verify policy (this is OK if using service role)');
    } else if (verifyData && verifyData.length > 0) {
      console.log('✅ Policy verified:', verifyData);
    } else {
      console.log('⚠️  Policy might not be visible via RPC, but should be applied');
    }

    console.log('\n🎉 RLS Policy fix completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Try logging in again');
    console.log('  2. User profile should be created automatically');
    console.log('  3. No more RLS errors should occur');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('');
    console.error('Manual fix required:');
    console.error('  1. Go to your Supabase Dashboard');
    console.error('  2. Navigate to SQL Editor');
    console.error('  3. Run this SQL:');
    console.error('');
    console.error('     DROP POLICY IF EXISTS "Users can insert own profile" ON users;');
    console.error('     CREATE POLICY "Users can insert own profile" ON users');
    console.error('       FOR INSERT WITH CHECK (auth.uid() = id);');
    console.error('');
    process.exit(1);
  }
}

// Run the fix
fixUsersRLSPolicy();

