---
name: supabase-integration
description: >
  Patterns for integrating Supabase in FinTec (Auth, Database, Storage, Realtime).
  Trigger: Working with authentication, database queries, RLS policies, storage, or realtime subscriptions.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Using Supabase, authentication, database queries, RLS, storage, or realtime'
allowed-tools: Read, Edit, Write, Grep, Task
---

## When to Use

Use this skill when:

- Implementing authentication (login, signup, session management)
- Querying the database (SELECT, INSERT, UPDATE, DELETE)
- Creating or modifying RLS policies
- Uploading/downloading files to Supabase Storage
- Setting up realtime subscriptions
- Migrating from local (Dexie) to Supabase

---

## Critical Patterns

### Pattern 1: Server-Side Client (SSR with Cookies)

**ALWAYS use server-side client for authentication to ensure cookies are properly set.**

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

### Pattern 2: Row Level Security (RLS)

**ALWAYS enable RLS and create policies for security.**

```sql
-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own transactions
CREATE POLICY "Users can update own transactions"
  ON transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
  ON transactions
  FOR DELETE
  USING (auth.uid() = user_id);
```

### Pattern 3: Repository Pattern with Supabase

```typescript
import { createClient } from '@/lib/supabase/server';
import { Transaction } from '@/types/domain';

export class SupabaseTransactionsRepository {
  async findAll(userId: string): Promise<Transaction[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Transaction[];
  }
  
  async create(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    
    if (error) throw error;
    return data as Transaction;
  }
}
```

---

## Authentication Patterns

### Login with Email/Password

```typescript
import { createClient } from '@/lib/supabase/server';

export async function login(email: string, password: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}
```

### Signup

```typescript
export async function signup(email: string, password: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  
  if (error) throw error;
  return data;
}
```

### Get Current User

```typescript
export async function getCurrentUser() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) throw error;
  return user;
}
```

### Logout

```typescript
export async function logout() {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) throw error;
}
```

---

## Database Query Patterns

### Simple Query

```typescript
const { data, error } = await supabase
  .from('accounts')
  .select('*')
  .eq('user_id', userId);
```

### Query with Joins

```typescript
const { data, error } = await supabase
  .from('transactions')
  .select(`
    *,
    account:accounts(name, type),
    category:categories(name, color)
  `)
  .eq('user_id', userId);
```

### Insert with Return

```typescript
const { data, error } = await supabase
  .from('budgets')
  .insert({
    user_id: userId,
    category_id: categoryId,
    amount: 50000, // Minor units
    period: 'MONTHLY'
  })
  .select()
  .single();
```

### Update

```typescript
const { data, error } = await supabase
  .from('goals')
  .update({ 
    current_amount: newAmount,
    updated_at: new Date().toISOString()
  })
  .eq('id', goalId)
  .eq('user_id', userId) // Security check
  .select()
  .single();
```

### Delete

```typescript
const { error } = await supabase
  .from('transactions')
  .delete()
  .eq('id', transactionId)
  .eq('user_id', userId); // Security check
```

---

## Realtime Subscriptions

### Subscribe to Changes

```typescript
import { createClient } from '@/lib/supabase/client';

export function subscribeToApprovals(userId: string, callback: (payload: any) => void) {
  const supabase = createClient();
  
  const channel = supabase
    .channel('approval-requests')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'approval_requests',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}
```

---

## Storage Patterns

### Upload File

```typescript
export async function uploadFile(file: File, path: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) throw error;
  return data;
}
```

### Get Public URL

```typescript
export function getPublicUrl(path: string) {
  const supabase = createClient();
  
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(path);
  
  return data.publicUrl;
}
```

---

## Decision Tree

```
Need authentication?           → Use server-side client with cookies
Need to query database?        → Use repository pattern + RLS
Need realtime updates?         → Use Supabase Realtime channels
Need file storage?             → Use Supabase Storage
Migrating from Dexie?          → Create Supabase repository implementation
Need to secure data?           → Enable RLS + create policies
```

---

## Migration from Dexie

### Step 1: Create Supabase Schema

```sql
-- Example: Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  account_id UUID REFERENCES accounts(id) NOT NULL,
  amount BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  type VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (see Pattern 2)
```

### Step 2: Implement Supabase Repository

```typescript
// repositories/supabase/transactions-repository.ts
import { ITransactionsRepository } from '../contracts/transactions-repository';
import { createClient } from '@/lib/supabase/server';

export class SupabaseTransactionsRepository implements ITransactionsRepository {
  // Implement interface methods using Supabase client
}
```

### Step 3: Switch Repository in Index

```typescript
// repositories/index.ts
import { SupabaseTransactionsRepository } from './supabase/transactions-repository';

export const transactionsRepository = new SupabaseTransactionsRepository();
```

---

## Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Testing with Supabase

```typescript
import { createClient } from '@supabase/supabase-js';

describe('Supabase Integration', () => {
  let supabase: SupabaseClient;
  
  beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for tests
    );
  });
  
  it('should create transaction', async () => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: testUserId,
        amount: 1000,
        currency: 'USD',
        type: 'EXPENSE'
      })
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

---

## Commands

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Generate TypeScript types
supabase gen types typescript --linked > types/supabase.ts

# Create migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database (local)
supabase db reset
```

---

## Resources

- **Client Setup**: See [lib/supabase/client.ts](file:///c:/Users/ismar/Documents/projects/fintec/lib/supabase/client.ts)
- **Server Setup**: See [lib/supabase/server.ts](file:///c:/Users/ismar/Documents/projects/fintec/lib/supabase/server.ts)
- **Repositories**: See [repositories/supabase/](file:///c:/Users/ismar/Documents/projects/fintec/repositories/supabase/)
- **GEMINI.md**: See [GEMINI.md](file:///c:/Users/ismar/Documents/projects/fintec/GEMINI.md) - Supabase Integration section
