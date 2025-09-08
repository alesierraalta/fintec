# Estructura del Codebase - FinTec

## Arquitectura General

FinTec sigue una arquitectura limpia con separación clara de responsabilidades:

```
FinTec/
├── app/                    # Next.js 14 App Router
├── components/             # Componentes React
├── lib/                    # Utilidades y helpers
├── repositories/           # Capa de datos
├── providers/              # Proveedores de servicios
├── types/                  # Tipos TypeScript
├── hooks/                  # Custom hooks
├── contexts/               # Contextos React
├── data/                   # Datos estáticos
├── tests/                  # Tests E2E
└── scripts/                # Scripts de utilidad
```

## Detalle por Directorio

### `/app` - Next.js App Router
```
app/
├── globals.css            # Estilos globales y variables CSS
├── layout.tsx             # Layout raíz de la aplicación
├── page.tsx              # Página principal (dashboard)
├── accounts/             # Gestión de cuentas
├── transactions/         # Gestión de transacciones
├── budgets/              # Gestión de presupuestos
├── goals/                # Metas de ahorro
├── reports/              # Reportes y análisis
└── settings/             # Configuración de usuario
```

### `/components` - Componentes React
```
components/
├── ui/                   # Componentes base reutilizables
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── modal.tsx
│   └── index.ts         # Barrel exports
├── layout/              # Componentes de layout
│   ├── main-layout.tsx
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── mobile-nav.tsx
├── dashboard/           # Componentes del dashboard
│   ├── dashboard-content.tsx
│   ├── desktop-dashboard.tsx
│   ├── mobile-dashboard.tsx
│   ├── accounts-overview.tsx
│   ├── quick-actions.tsx
│   ├── recent-transactions.tsx
│   └── spending-chart.tsx
├── forms/               # Formularios
│   ├── account-form.tsx
│   ├── transaction-form.tsx
│   ├── budget-form.tsx
│   └── goal-form.tsx
├── auth/                # Autenticación
│   ├── auth-guard.tsx
│   ├── login-form.tsx
│   └── register-form.tsx
└── [feature]/           # Componentes por funcionalidad
    ├── budgets/
    ├── categories/
    ├── charts/
    ├── currency/
    ├── filters/
    ├── goals/
    ├── reports/
    ├── tables/
    ├── transactions/
    ├── transfers/
    └── tutorial/
```

### `/lib` - Utilidades
```
lib/
├── utils.ts             # Utilidades generales
├── money.ts             # Manejo de dinero y conversiones
├── dates.ts             # Utilidades de fechas
├── csv.ts               # Exportación CSV
├── validations.ts       # Esquemas de validación Zod
└── constants.ts         # Constantes de la aplicación
```

### `/repositories` - Capa de Datos
```
repositories/
├── contracts/           # Interfaces de repositorio
│   ├── account-repository.ts
│   ├── transaction-repository.ts
│   ├── budget-repository.ts
│   └── goal-repository.ts
├── local/               # Implementación local (Dexie)
│   ├── db.ts           # Configuración de base de datos
│   ├── account-repository.ts
│   ├── transaction-repository.ts
│   └── index.ts        # Exports
├── supabase/            # Implementación Supabase (stubs)
│   ├── client.ts       # Cliente Supabase
│   ├── types.ts        # Tipos de base de datos
│   └── migrations/     # Migraciones SQL
└── index.ts             # Factory de repositorios
```

### `/providers` - Proveedores de Servicios
```
providers/
├── exchange-rate-provider.ts  # Tasas de cambio
├── notification-provider.ts   # Notificaciones
└── analytics-provider.ts      # Analytics
```

### `/types` - Tipos TypeScript
```
types/
├── domain.ts            # Modelos de dominio
├── api.ts               # Tipos de API
├── ui.ts                # Tipos de UI
└── index.ts             # Barrel exports
```

### `/hooks` - Custom Hooks
```
hooks/
├── use-accounts.ts      # Hook para cuentas
├── use-transactions.ts  # Hook para transacciones
├── use-budgets.ts       # Hook para presupuestos
├── use-goals.ts         # Hook para metas
├── use-sidebar.ts       # Hook para sidebar
└── use-local-storage.ts # Hook para localStorage
```

### `/contexts` - Contextos React
```
contexts/
├── auth-context.tsx     # Contexto de autenticación
├── theme-context.tsx    # Contexto de tema
└── currency-context.tsx # Contexto de moneda
```

## Patrones de Arquitectura

### 1. Repository Pattern
- Abstracción de la capa de datos
- Contratos definidos en `/repositories/contracts`
- Implementaciones intercambiables (local/Supabase)

### 2. Provider Pattern
- Servicios externos encapsulados
- Fácil testing con mocks
- Configuración centralizada

### 3. Custom Hooks
- Lógica de estado reutilizable
- Separación de concerns
- Testing simplificado

### 4. Component Composition
- Componentes pequeños y enfocados
- Reutilización a través de props
- Barrel exports para imports limpios

## Convenciones de Naming

### Archivos
- Componentes: `kebab-case.tsx`
- Hooks: `use-feature-name.ts`
- Utilidades: `kebab-case.ts`
- Tipos: `kebab-case.ts`

### Directorios
- Siempre `kebab-case`
- Organizados por funcionalidad
- Barrel exports en `index.ts`

### Componentes
- PascalCase para nombres
- Props interface en el mismo archivo
- Default export para componente principal

## Flujo de Datos

```
UI Component → Custom Hook → Repository → Data Source
     ↓              ↓            ↓           ↓
  Render         State Mgmt   Abstraction  IndexedDB/Supabase
```

## Testing Structure

```
tests/
├── e2e/                 # Tests end-to-end
├── integration/         # Tests de integración
└── __mocks__/           # Mocks para testing

# Tests unitarios junto a los archivos
components/
├── ui/
│   ├── button.tsx
│   └── button.test.tsx  # Test del componente
```

## Configuración

### Archivos de Configuración
- `next.config.js` - Configuración Next.js
- `tailwind.config.ts` - Configuración TailwindCSS
- `tsconfig.json` - Configuración TypeScript
- `.eslintrc.json` - Configuración ESLint
- `.prettierrc` - Configuración Prettier
- `jest.config.js` - Configuración Jest
- `playwright.config.ts` - Configuración Playwright

### Variables de Entorno
- `.env.local` - Variables locales
- `.env.example` - Ejemplo de variables

## Migración a Supabase

Cuando se migre a Supabase:
1. Implementar repositorios en `/repositories/supabase`
2. Cambiar factory en `/repositories/index.ts`
3. Configurar variables de entorno
4. Ejecutar migraciones SQL
5. Implementar autenticación real