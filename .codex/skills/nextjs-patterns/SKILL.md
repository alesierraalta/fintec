---
name: nextjs-patterns
description: >
  Next.js 14 App Router patterns, Server/Client Components, and performance optimization.
  Trigger: Creating pages, layouts, API routes, or optimizing Next.js applications.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Working with Next.js, App Router, Server Components, or frontend optimization'
allowed-tools: Read, Edit, Write, Grep, Task
---

## When to Use

Use this skill when:

- Creating new pages or layouts
- Implementing Server or Client Components
- Building API routes
- Optimizing performance (images, fonts, bundles)
- Implementing metadata and SEO
- Setting up middleware or route handlers

---

## Critical Patterns

### Pattern 1: Server Components by Default

**ALWAYS use Server Components unless you need client-side interactivity.**

```tsx
// ✅ CORRECT - Server Component (default)
// app/dashboard/page.tsx
import { getCurrentUser } from '@/lib/auth';
import { transactionsRepository } from '@/repositories';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const transactions = await transactionsRepository.findAll(user.id);
  
  return (
    <div>
      <h1>Dashboard</h1>
      <TransactionList transactions={transactions} />
    </div>
  );
}

// ❌ WRONG - Unnecessary Client Component
'use client';
export default function DashboardPage() {
  const [transactions, setTransactions] = useState([]);
  
  useEffect(() => {
    fetch('/api/transactions').then(/* ... */);
  }, []);
  
  // ...
}
```

### Pattern 2: Client Components for Interactivity

**Use 'use client' directive for components that need hooks, events, or browser APIs.**

```tsx
// ✅ CORRECT - Client Component for interactivity
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function TransactionForm() {
  const [amount, setAmount] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={amount} 
        onChange={(e) => setAmount(e.target.value)} 
      />
      <Button type="submit">Create</Button>
    </form>
  );
}
```

### Pattern 3: API Routes with Type Safety

```typescript
// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { transactionsRepository } from '@/repositories';
import { z } from 'zod';

const createTransactionSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Validate
    const body = await request.json();
    const data = createTransactionSchema.parse(body);
    
    // Execute
    const transaction = await transactionsRepository.create({
      ...data,
      userId: user.id,
    });
    
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Transaction creation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Pattern 4: Metadata for SEO

```tsx
// app/dashboard/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | FinTec',
  description: 'View your financial overview and recent transactions',
  openGraph: {
    title: 'Dashboard | FinTec',
    description: 'View your financial overview and recent transactions',
    type: 'website',
  },
};

export default function DashboardPage() {
  // ...
}
```

### Pattern 5: Dynamic Metadata

```tsx
// app/transactions/[id]/page.tsx
import { Metadata } from 'next';
import { transactionsRepository } from '@/repositories';

export async function generateMetadata({ 
  params 
}: { 
  params: { id: string } 
}): Promise<Metadata> {
  const transaction = await transactionsRepository.findById(params.id);
  
  return {
    title: `Transaction: ${transaction.description} | FinTec`,
    description: `View details for ${transaction.description}`,
  };
}

export default async function TransactionPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const transaction = await transactionsRepository.findById(params.id);
  
  return <TransactionDetails transaction={transaction} />;
}
```

---

## Performance Optimization

### Image Optimization

```tsx
import Image from 'next/image';

export function UserAvatar({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="rounded-full"
      priority={false} // Only true for above-the-fold images
    />
  );
}
```

### Font Optimization

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

### Code Splitting with Dynamic Imports

```tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const ChartComponent = dynamic(() => import('@/components/charts/line-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Disable SSR if component uses browser-only APIs
});

export function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <ChartComponent data={data} />
    </div>
  );
}
```

---

## Layout Patterns

### Root Layout

```tsx
// app/layout.tsx
import { Metadata } from 'next';
import { Providers } from '@/providers';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'FinTec - Smart Personal Finance',
    template: '%s | FinTec',
  },
  description: 'Manage your finances intelligently',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Nested Layouts

```tsx
// app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Data Fetching Patterns

### Parallel Data Fetching

```tsx
export default async function DashboardPage() {
  // Fetch in parallel
  const [user, transactions, accounts] = await Promise.all([
    getCurrentUser(),
    transactionsRepository.findAll(),
    accountsRepository.findAll(),
  ]);
  
  return (
    <div>
      <UserInfo user={user} />
      <TransactionList transactions={transactions} />
      <AccountList accounts={accounts} />
    </div>
  );
}
```

### Sequential Data Fetching (when needed)

```tsx
export default async function TransactionPage({ params }: { params: { id: string } }) {
  // First fetch transaction
  const transaction = await transactionsRepository.findById(params.id);
  
  // Then fetch related account (depends on transaction)
  const account = await accountsRepository.findById(transaction.accountId);
  
  return <TransactionDetails transaction={transaction} account={account} />;
}
```

### Streaming with Suspense

```tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <Suspense fallback={<TransactionsSkeleton />}>
        <TransactionsList />
      </Suspense>
      
      <Suspense fallback={<ChartSkeleton />}>
        <ExpenseChart />
      </Suspense>
    </div>
  );
}

async function TransactionsList() {
  const transactions = await transactionsRepository.findAll();
  return <TransactionList transactions={transactions} />;
}
```

---

## Route Handlers

### GET with Query Parameters

```typescript
// app/api/transactions/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const transactions = await transactionsRepository.findAll(user.id, {
    type: type as any,
    limit,
  });
  
  return NextResponse.json(transactions);
}
```

### PATCH for Updates

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  const updated = await transactionsRepository.update(params.id, body);
  
  return NextResponse.json(updated);
}
```

---

## Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  
  // Refresh session if expired
  await supabase.auth.getSession();
  
  // Protect routes
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Decision Tree

```
Need interactivity (clicks, state)?  → Client Component ('use client')
Fetching data on server?             → Server Component (default)
Need SEO metadata?                   → Use generateMetadata()
Building API endpoint?               → Create route.ts in app/api/
Need authentication check?           → Use middleware.ts
Heavy component?                     → Use dynamic import
Multiple data sources?               → Use Promise.all() for parallel fetch
```

---

## Common Mistakes

### ❌ DON'T: Fetch in Client Component

```tsx
// WRONG
'use client';
export default function Page() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetch('/api/data').then(/* ... */);
  }, []);
}
```

### ✅ DO: Fetch in Server Component

```tsx
// CORRECT
export default async function Page() {
  const data = await getData();
  return <DataDisplay data={data} />;
}
```

---

## Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Analyze bundle size
npm run build -- --analyze

# Type check
npm run type-check

# Lint
npm run lint
```

---

## Resources

- **App Directory**: See [app/](file:///c:/Users/ismar/Documents/projects/fintec/app/)
- **Components**: See [components/](file:///c:/Users/ismar/Documents/projects/fintec/components/)
- **Next.js Config**: See [next.config.js](file:///c:/Users/ismar/Documents/projects/fintec/next.config.js)
- **README**: See [README.md](file:///c:/Users/ismar/Documents/projects/fintec/README.md)
