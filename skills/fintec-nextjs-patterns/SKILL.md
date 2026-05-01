---
name: fintec-nextjs-patterns
description: >
  Next.js 16 App Router patterns for FinTec including route groups, server/client components,
  data fetching, lazy loading, and iOS viewport configuration. Use when creating routes, pages,
  or implementing data patterns.
  Trigger: "Next.js", "route", "page", "App Router", "server component", "client component", "data fetching", "lazy loading", "API route"
license: Apache-2.0
metadata:
  author: gentleman-programmer
  version: '1.0'
---

## When to Use

- Creando nuevas rutas o páginas
- Implementando data fetching
- Configurando layouts
- Trabajando con Server/Client Components
- Optimizando performance

## Critical Patterns

### 1. Route Organization

FinTec usa route groups para separar público vs app:

```
app/
├── (public)/          # Landing pages, auth (sin sidebar)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── auth/
│   └── pricing/
├── (app)/             # Rutas autenticadas (con sidebar)
│   ├── layout.tsx
│   ├── page.tsx       # Dashboard
│   ├── accounts/
│   ├── transactions/
│   └── ...
└── api/               # API routes
```

### 2. Server vs Client Component Rules

**Server Components (default):**

```tsx
// ✅ Landing page sections (SEO-critical)
export default function HeroSection() {
  return <section>...</section>;
}

// ✅ Data fetching en servidor
export default async function AccountsPage() {
  const accounts = await getAccounts();
  return <AccountsList accounts={accounts} />;
}

// ✅ Metadata
export const metadata = {
  title: 'FinTec - Dashboard',
  description: 'Financial management dashboard',
};
```

**Client Components ('use client'):**

```tsx
'use client';

// ✅ Componentes interactivos
export default function TransactionForm() {
  const [amount, setAmount] = useState('');
  return <form>...</form>;
}

// ✅ Hooks necesarios
export default function DashboardContent() {
  const { isMobile } = useSidebar();
  const { data } = useQuery(...);
  return <div>...</div>;
}
```

### 3. Layout Patterns

**Root Layout:**

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body className={inter.className}>
        <RouteAwareProviders>
          {children}
          <Toaster />
          <div id="modal-root" />
        </RouteAwareProviders>
      </body>
    </html>
  );
}
```

**Public Layout (sin sidebar):**

```tsx
// app/(public)/layout.tsx
export default function PublicLayout({ children }) {
  return (
    <div className="min-h-dynamic-screen">
      <LandingNav />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
```

**App Layout (con sidebar):**

```tsx
// components/layout/main-layout.tsx
export default function MainLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-4 pb-safe-bottom pt-safe-top">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
```

### 4. Page Transitions

```tsx
// app/template.tsx
import { PageTransition } from '@/components/layout/page-transition';

export default function Template({ children }) {
  return <PageTransition>{children}</PageTransition>;
}
```

### 5. Lazy Loading Patterns

```tsx
// Lazy load heavy components
import dynamic from 'next/dynamic';

const LazyDashboardContent = dynamic(
  () => import('@/components/dashboard/lazy-dashboard-content'),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false,
  }
);

const LazyReportsContent = dynamic(
  () => import('@/components/reports/lazy-reports-content'),
  {
    loading: () => <ReportsSkeleton />,
    ssr: false,
  }
);

// Usage
export default function DashboardPage() {
  return (
    <div>
      <StaticContent />
      <LazyDashboardContent />
    </div>
  );
}
```

### 6. Data Fetching (Server Components)

```tsx
// ✅ Server-side data fetching
export default async function AccountsPage() {
  const accounts = await fetchAccounts();

  return (
    <div className="glass-card p-6">
      <h1 className="mb-6 text-ios-large-title">Accounts</h1>
      <AccountsList accounts={accounts} />
    </div>
  );
}
```

### 7. Data Fetching (Client Components)

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';

export default function TransactionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  });

  if (isLoading) return <TransactionsSkeleton />;
  if (error) return <ErrorState />;

  return <TransactionsList transactions={data} />;
}
```

### 8. API Routes

```tsx
// app/api/transactions/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const transactions = await getTransactions();
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transaction = await createTransaction(body);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 400 }
    );
  }
}
```

### 9. iOS Viewport Configuration

```tsx
// app/layout.tsx o page.tsx
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};
```

### 10. Font Optimization

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} dark`}>
      <body>{children}</body>
    </html>
  );
}
```

## Performance Patterns

### 1. Suspense Boundaries

```tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <SpendingChart />
      </Suspense>
    </div>
  );
}
```

### 2. Image Optimization

```tsx
import Image from 'next/image';

// Optimized images
<Image
  src="/logo.png"
  alt="FinTec Logo"
  width={200}
  height={50}
  priority
  className="rounded-lg"
/>;
```

### 3. Route Handlers (Middleware)

```tsx
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Auth check
  const token = request.cookies.get('token');

  if (!token && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
```

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Start production
npm start
```

## Resources

- **App Structure**: See [app/](../app/) directory
- **Layout Components**: See [components/layout/](../components/layout/)
- **API Routes**: See [app/api/](../app/api/)
- **Next.js Docs**: See [references/](references/) for Next.js patterns
