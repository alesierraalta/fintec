# Convenciones de Código y Estilo - FinTec

## TypeScript

### Configuración
- **Modo estricto** habilitado (`strict: true`)
- **noEmit**: true (Next.js maneja la compilación)
- **Resolución de módulos**: bundler
- **JSX**: preserve (Next.js lo procesa)

### Tipos y Interfaces
```typescript
// Usar PascalCase para tipos e interfaces
interface UserAccount {
  id: string;
  name: string;
  balance: number;
}

// Usar type para uniones y aliases
type AccountType = 'bank' | 'credit' | 'cash' | 'investment';

// Usar enums para constantes relacionadas
enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

### Naming Conventions
- **Variables y funciones**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Componentes**: PascalCase
- **Archivos**: kebab-case.tsx
- **Directorios**: kebab-case

## React y Next.js

### Componentes
```typescript
// Usar function declarations para componentes
export default function MyComponent({ prop1, prop2 }: Props) {
  return <div>{prop1}</div>;
}

// Props interface en el mismo archivo
interface Props {
  prop1: string;
  prop2?: number;
}
```

### Hooks
```typescript
// Custom hooks empiezan con 'use'
export function useLocalStorage<T>(key: string, initialValue: T) {
  // implementación
}

// Hooks en archivos separados en /hooks
```

### Estructura de Archivos
```
components/
├── ui/              # Componentes base reutilizables
├── dashboard/       # Componentes específicos del dashboard
├── forms/           # Formularios
└── layout/          # Componentes de layout
```

## Prettier Configuration

```json
{
  "semi": true,           // Punto y coma obligatorio
  "trailingComma": "es5", // Coma final en objetos/arrays
  "singleQuote": true,    // Comillas simples
  "printWidth": 80,       // Ancho máximo de línea
  "tabWidth": 2,          // 2 espacios de indentación
  "useTabs": false        // Usar espacios, no tabs
}
```

## ESLint Rules

- **Extends**: `next/core-web-vitals`
- **Custom rules**:
  - `no-console: "warn"` - Advertencia para console.log

## TailwindCSS

### Organización de Clases
```typescript
// Usar clsx para clases condicionales
import { clsx } from 'clsx';

const buttonClasses = clsx(
  'px-4 py-2 rounded-md font-medium', // base
  'hover:bg-opacity-90 transition-colors', // interacciones
  {
    'bg-blue-600 text-white': variant === 'primary',
    'bg-gray-200 text-gray-900': variant === 'secondary',
  }
);
```

### Responsive Design
```typescript
// Mobile-first approach
className="text-sm md:text-base lg:text-lg"
```

### Colores Personalizados
- Usar variables CSS definidas en `tailwind.config.ts`
- Modo oscuro con `class` strategy

## Imports y Exports

### Path Mapping
```typescript
// Usar alias definidos en tsconfig.json
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';
import type { Account } from '@/types/domain';
```

### Orden de Imports
1. React y Next.js
2. Librerías externas
3. Imports internos (con @/)
4. Imports relativos
5. Tipos (con `type`)

```typescript
import React from 'react';
import { NextPage } from 'next';
import { clsx } from 'clsx';

import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/use-accounts';

import type { Account } from '@/types/domain';
```

## Manejo de Estado

### Zustand
```typescript
// Stores en /stores con tipos explícitos
interface AccountStore {
  accounts: Account[];
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
}
```

### React Hook Form
```typescript
// Usar con Zod para validación
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().positive('Amount must be positive'),
});

type FormData = z.infer<typeof schema>;
```

## Comentarios y Documentación

### JSDoc para funciones públicas
```typescript
/**
 * Formats a monetary amount with currency symbol
 * @param amount - Amount in minor units (cents)
 * @param currency - Currency code (USD, EUR, etc.)
 * @returns Formatted string with currency symbol
 */
export function formatMoney(amount: number, currency: string): string {
  // implementación
}
```

### Comentarios inline
```typescript
// TODO: Implement error handling
// FIXME: This calculation might overflow
// NOTE: This is a temporary workaround
```

## Testing

### Archivos de Test
- Unit tests: `*.test.ts` o `*.test.tsx`
- E2E tests: `*.spec.ts` en `/tests`

### Naming
```typescript
// Describe blocks usan el nombre del componente/función
describe('formatMoney', () => {
  it('should format USD correctly', () => {
    // test implementation
  });
});
```