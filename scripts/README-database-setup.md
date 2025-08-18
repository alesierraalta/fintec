# Database Setup Instructions

## Prerequisites

1. You need to have a Supabase project named "fintec" already created
2. You need to have the project URL and API keys

## Setup Steps

### 1. Get Supabase Project Information

Go to your Supabase dashboard for the "fintec" project and copy:
- Project URL (something like: `https://your-project-id.supabase.co`)
- Anon/Public Key (starts with `eyJ...`)
- Service Role Key (starts with `eyJ...`, different from anon key)

### 2. Update Environment Variables

Update the `.env.local` file with your actual Supabase credentials:

```bash
# Replace these with your actual values
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
```

### 3. Run Database Migration

1. Go to your Supabase project dashboard
2. Navigate to the "SQL Editor" section
3. Copy the entire contents of `scripts/setup-database.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration

This will create all the necessary tables, indexes, RLS policies, and seed data.

### 4. Verify Setup

After running the migration, you should see these tables in your database:
- `users`
- `accounts` 
- `transactions`
- `transfers`
- `categories`
- `budgets`
- `goals`
- `exchange_rates`

### 5. Test Connection

Run the development server to test the database connection:

```bash
npm run dev
```

The app should now be connected to your Supabase database instead of the local IndexedDB.

## What's Next

After the database is set up:

1. The app will automatically use Supabase instead of local storage
2. User authentication will be handled by Supabase Auth
3. All data will be stored in your PostgreSQL database
4. Row Level Security (RLS) will ensure users only see their own data

## Troubleshooting

If you encounter issues:

1. **Connection errors**: Check that your environment variables are correct
2. **Permission errors**: Ensure RLS policies are properly set up
3. **Missing tables**: Re-run the database migration script
4. **Authentication issues**: Check Supabase Auth configuration

## Migration from Local Data

If you have existing data in the local version, you'll need to:

1. Export data from the local version (there should be an export function)
2. Transform the data to match Supabase format
3. Import it using the Supabase client

This migration process can be automated with a custom script if needed.

