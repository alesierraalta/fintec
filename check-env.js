// Script to check available environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking environment variables...');
console.log('\n📋 All environment variables:');

// Show all env vars that contain 'SUPABASE'
Object.keys(process.env)
  .filter(key => key.includes('SUPABASE'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key] ? '✅ Present' : '❌ Missing'}`);
  });

console.log('\n🔑 Required variables:');
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Present' : '❌ Missing'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Present' : '❌ Missing'}`);

// Also check for alternative variable names
console.log('\n🔍 Checking alternative variable names:');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Present' : '❌ Missing'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing'}`);
console.log(`SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ Present' : '❌ Missing'}`);

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.log(`\n🌐 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
}

console.log('\n💡 If variables are missing, please add them to .env.local file.');