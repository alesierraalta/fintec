# FinTec Next.js 16 — Full Patterns

Relocated from SKILL.md. Project: Next.js 16.1.6, React 19.2, App Router.

## Route Organization (real structure)

```
app/
├── (public)/            # Landing + auth (no sidebar)
│   ├── layout.tsx
│   └── components/      # landing sections
├── auth/                # callback, login, register, reset-password
├── accounts/, transactions/, budgets/, goals/, reports/ ...  # feature routes
├── api/                 # route handlers
└── layout.tsx           # root layout: metadata + viewport + Inter + modal-root
```

Note: there is no `(app)` route group — the authenticated shell is `components/layout/main-layout.tsx`.

## Server vs Client Components

```tsx
// Server Component (default) — data fetching on the server
export default async function AccountsPage() {
  const accounts = await getAccounts();
  return <AccountsList accounts={accounts} />;
}

// Client Component — interactivity
('use client');
export default function TransactionForm() {
  const [amount, setAmount] = useState('');
  return <form>...</form>;
}
```

## Async params (Next 15+/16)

```tsx
type PageProps = { params: Promise<{ id: string }> };

export default async function TransactionPage({ params }: PageProps) {
  const { id } = await params;
  const transaction = await getTransaction(id);
  return <TransactionDetails transaction={transaction} />;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Transaction: ${id} | FinTec` };
}
```

## Root Layout (matches app/layout.tsx)

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'FinTec - Tu Plataforma de Finanzas Personales' /* ... */,
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} overflow-x-hidden`}>
        <RouteAwareProviders>
          <div id="root" className="h-dynamic-screen w-full overflow-x-hidden">
            {children}
          </div>
        </RouteAwareProviders>
        <Toaster position="top-right" richColors />
        <div id="modal-root" />
      </body>
    </html>
  );
}
```

## Lazy Loading

```tsx
import dynamic from 'next/dynamic';

// Must be inside a CLIENT component when using ssr:false
const TransactionForm = dynamic(
  () =>
    import('@/components/forms/transaction-form').then(
      (m) => m.TransactionForm
    ),
  { loading: () => <FormLoading />, ssr: false }
);
```

`main-layout.tsx` already lazy-loads `TransactionForm` and `FloatingActionButton` this way.

## Client Data Fetching (react-query)

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

## API Route Handlers

```tsx
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const transactions = await getTransactions();
  return NextResponse.json(transactions);
}
```

Production routes use `withErrorHandling` from `lib/api-middleware.ts` for consistent error responses.

## Middleware (proxy) Note

Next 16 renames `middleware.ts` to `proxy.ts` (export `proxy`). The project still uses `middleware.ts`, which delegates to `lib/supabase/middleware.ts`:

```tsx
// middleware.ts (current project)
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}
```

## Bundle Analysis

`next build` has no `--analyze` flag. To add bundle analysis, install `@next/bundle-analyzer` and wrap `next.config.js` with `withBundleAnalyzer`.
