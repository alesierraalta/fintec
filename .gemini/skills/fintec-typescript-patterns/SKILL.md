---
name: fintec-typescript-patterns
description: >
  TypeScript advanced patterns for FinTec including generic utilities, discriminated unions,
  React.forwardRef patterns, and type-safe component props. Use when implementing complex type logic
  or creating reusable components.
  Trigger: "TypeScript", "types", "generics", "discriminated union", "forwardRef", "type safety", "props interface"
license: Apache-2.0
metadata:
  author: gentleman-programmer
  version: '1.0'
---

## When to Use

- Creando componentes reutilizables
- Implementando tipos complejos
- Trabajando con genéricos
- Definiendo interfaces de props
- Refactorizando lógica de tipos

## Critical Patterns

### 1. UI Primitive Props with forwardRef

TODO componente UI usa `React.forwardRef`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'ghost'
    | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(
          'base-button',
          `button-${variant}`,
          `button-${size}`,
          { 'button-loading': loading },
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {LeftIcon && <LeftIcon className="button-icon" />}
        {loading ? <LoadingSpinner /> : children}
        {RightIcon && <RightIcon className="button-icon" />}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
```

### 2. LucideIcon Type Pattern

```tsx
import type { LucideIcon } from 'lucide-react';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive?: boolean;
}

export function NavItem({ icon: Icon, label, href, isActive }: NavItemProps) {
  return (
    <a href={href} className={cn('nav-item', { 'nav-item-active': isActive })}>
      <Icon className="nav-icon" />
      <span>{label}</span>
    </a>
  );
}
```

### 3. Discriminated Unions para Variants

```tsx
type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'premium';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success-500/20 text-success-foreground',
  warning: 'bg-warning-500/20 text-warning-foreground',
  error: 'bg-destructive-500/20 text-destructive-foreground',
  info: 'bg-primary-500/20 text-primary-foreground',
  premium: 'bg-purple-500/20 text-purple-400',
};

export function Badge({
  variant = 'default',
  children,
  className,
}: BadgeProps) {
  return (
    <span className={cn('badge', variantMap[variant], className)}>
      {children}
    </span>
  );
}
```

### 4. Generic Utility Types

```tsx
// Group array por clave
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

// Deep clone con tipos
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// Debounce genérico
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle genérico
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
```

### 5. Component Props con Conditional Types

```tsx
// Props que cambian según variant
type InputVariant = 'text' | 'number' | 'email' | 'password';

interface BaseInputProps {
  label: string;
  error?: string;
  helperText?: string;
  className?: string;
}

type InputProps<T extends InputVariant> = BaseInputProps & {
  type: T;
  value: T extends 'number' ? number : string;
  onChange: (value: T extends 'number' ? number : string) => void;
  placeholder?: string;
};

export function Input<T extends InputVariant>({
  label,
  error,
  helperText,
  type,
  value,
  onChange,
  placeholder,
  className,
}: InputProps<T>) {
  return (
    <div className={cn('input-wrapper', { 'input-error': error }, className)}>
      <label className="input-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => {
          const val =
            type === 'number' ? Number(e.target.value) : e.target.value;
          onChange(val);
        }}
        placeholder={placeholder}
        className="input-field"
      />
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && (
        <span className="input-helper-text">{helperText}</span>
      )}
    </div>
  );
}
```

### 6. Type-Safe Event Handlers

```tsx
// Form submit con tipos
interface TransactionFormData {
  amount: number;
  description: string;
  categoryId: string;
  date: Date;
  type: 'income' | 'expense';
}

function handleFormSubmit(
  e: React.FormEvent<HTMLFormElement>,
  onSubmit: (data: TransactionFormData) => void
) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);

  const data: TransactionFormData = {
    amount: Number(formData.get('amount')),
    description: formData.get('description') as string,
    categoryId: formData.get('category') as string,
    date: new Date(formData.get('date') as string),
    type: formData.get('type') as 'income' | 'expense',
  };

  onSubmit(data);
}
```

### 7. Repository Pattern Types

```tsx
// Interface genérica para repositorios
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
}

// Implementación tipada
export class AccountRepository implements Repository<Account, string> {
  async findById(id: string): Promise<Account | null> {
    // Implementation
  }

  async findAll(): Promise<Account[]> {
    // Implementation
  }

  async create(data: Omit<Account, 'id'>): Promise<Account> {
    // Implementation
  }

  async update(id: string, data: Partial<Account>): Promise<Account> {
    // Implementation
  }

  async delete(id: string): Promise<void> {
    // Implementation
  }
}
```

### 8. Hook Types

```tsx
// Custom hook con tipos
interface UseSidebarReturn {
  isMobile: boolean;
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export function useSidebar(): UseSidebarReturn {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return {
    isMobile,
    isOpen,
    toggle: () => setIsOpen((prev) => !prev),
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}

// Hook de formulario con Zod
interface UseTransactionFormReturn {
  form: UseFormReturn<TransactionFormData>;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function useTransactionForm(): UseTransactionFormReturn {
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      description: '',
      categoryId: '',
      date: new Date(),
      type: 'expense',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      await createTransaction(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { form, onSubmit, isSubmitting };
}
```

### 9. Subscription Types

```tsx
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface Subscription {
  tier: SubscriptionTier;
  expiresAt: Date | null;
  features: Feature[];
  limits: {
    accounts: number;
    transactions: number;
    aiQueries: number;
  };
}

// Type guard
export function isPremiumFeature(
  feature: Feature,
  tier: SubscriptionTier
): boolean {
  const premiumFeatures = ['ai-chat', 'advanced-reports', 'multi-currency'];
  return tier === 'free' && premiumFeatures.includes(feature);
}
```

## Commands

```bash
# Type check
npm run type-check

# Build (includes type checking)
npm run build
```

## Resources

- **Utility Types**: See [lib/utils.ts](../lib/utils.ts)
- **Component Types**: See [components/ui/](../components/ui/)
- **Repository Pattern**: See [repositories/](../repositories/)
