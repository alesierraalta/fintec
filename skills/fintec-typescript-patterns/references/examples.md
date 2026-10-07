# FinTec TypeScript Patterns — Examples

Relocated from SKILL.md to keep the skill body under the token budget. All tokens below match the actual FinTec config (`tailwind.config.ts`, `app/globals.css`, `@/types`).

## 1. UI Primitive Props with ref

React 19 supports ref-as-prop; existing code uses `React.forwardRef`. Match the actual Button in `components/ui/button.tsx`.

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import { ButtonVariant, ButtonSize } from '@/types';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; // primary | secondary | success | warning | danger | ghost | outline
  size?: ButtonSize; // sm | md | lg
  loading?: boolean;
  icon?: React.ReactNode;
}
```

Ref-as-prop (React 19, new components):

```tsx
export function IconButton({
  ref,
  className,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      className={cn('min-h-[44px] min-w-[44px]', className)}
      {...props}
    />
  );
}
```

## 2. LucideIcon Type Pattern

```tsx
import type { LucideIcon } from 'lucide-react';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive?: boolean;
}
```

## 3. Discriminated Unions for Variants

Valid token map against `tailwind.config.ts` + `app/globals.css`:

- `primary-500` exists; `primary-foreground` exists.
- `success-*` / `warning-*` / `error-*` have full 50-950 scales but NO `-foreground` token. Use the `text-success`, `text-warning`, `text-error` utilities from globals.css.
- `destructive` has DEFAULT + `destructive-foreground` only — NO `destructive-500`.

```tsx
type BadgeVariant =
  'default' | 'success' | 'warning' | 'error' | 'info' | 'premium';

const variantMap: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  success: 'bg-success-500/20 text-success',
  warning: 'bg-warning-500/20 text-warning',
  error: 'bg-error-500/20 text-error',
  info: 'bg-primary-500/20 text-primary-foreground',
  premium: 'bg-purple-500/20 text-purple-400',
};
```

## 4. Generic Utility Types

```tsx
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      (acc[groupKey] ??= []).push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
) {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

## 5. Conditional Types on Props

```tsx
type InputVariant = 'text' | 'number' | 'email' | 'password';

interface BaseInputProps {
  label: string;
  error?: string;
  className?: string;
}

type InputProps<T extends InputVariant> = BaseInputProps & {
  type: T;
  value: T extends 'number' ? number : string;
  onChange: (value: T extends 'number' ? number : string) => void;
};
```

## 6. Type-Safe Event Handlers (money in minor units)

Per money-handling: amounts are integer minor units, never floats.

```tsx
interface TransactionFormData {
  amount: number; // minor units (cents)
  description: string;
  categoryId: string;
  type: 'income' | 'expense';
}

function handleFormSubmit(
  e: React.FormEvent<HTMLFormElement>,
  onSubmit: (data: TransactionFormData) => void
) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  onSubmit({
    amount: Number(formData.get('amount')),
    description: String(formData.get('description') ?? ''),
    categoryId: String(formData.get('category') ?? ''),
    type: formData.get('type') as 'income' | 'expense',
  });
}
```

## 7. Repository Pattern Types

```tsx
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
}
```

Contract implementations live in `repositories/contracts/` and `repositories/supabase/`.

## 8. Hook Return Types

```tsx
interface UseSidebarReturn {
  isMobile: boolean;
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}
```

`useSidebar` ships from `@/contexts/sidebar-context` (not a hook file) and returns `isMobile`; `useMediaQuery` lives in `hooks/use-media-query.ts`.

## 9. Subscription Types + Correct isPremiumFeature

```tsx
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface Subscription {
  tier: SubscriptionTier;
  expiresAt: Date | null;
  features: string[];
}

// CORRECT logic: premium features require a NON-free tier.
export function isPremiumFeature(
  feature: string,
  tier: SubscriptionTier
): boolean {
  const premiumFeatures = ['ai-chat', 'advanced-reports', 'multi-currency'];
  return tier !== 'free' && premiumFeatures.includes(feature);
}
```

## Commands

```bash
npm run type-check   # tsc --noEmit -p tsconfig.typecheck.json
npm run build        # next build (includes type checking)
```
