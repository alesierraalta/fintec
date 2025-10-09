# Sistema de Límites para Usuarios Free

## Overview

Sistema completo de validación y avisos para usuarios del plan gratuito, implementado tanto en frontend como backend para asegurar una experiencia consistente y segura.

## Límites del Plan Free

Definidos en `types/subscription.ts`:

```typescript
free: {
  transactions: 500,        // 500 transacciones/mes
  backups: 4,              // 4 backups (1 por semana)
  dataHistory: 6,          // 6 meses de historial
  exports: 5,              // 5 exportaciones
  apiCalls: 0,             // Sin acceso a API
  aiRequests: 0,           // Sin acceso a IA
}
```

## Arquitectura

### 1. Tracking de Uso

**Tabla:** `usage_tracking`

```typescript
interface UsageTracking {
  id: string;
  userId: string;
  monthYear: string; // Format: YYYY-MM
  transactionCount: number;
  backupCount: number;
  apiCalls: number;
  exportCount: number;
  aiRequests: number;
  createdAt: string;
  updatedAt: string;
}
```

**API Endpoint:** `/api/subscription/status`

Retorna información completa del uso actual:

```typescript
{
  subscription: Subscription | null,
  tier: SubscriptionTier,
  usage: UsageTracking | null,
  usageStatus: UsageStatus,
  limits: SubscriptionLimits
}
```

### 2. Frontend Components

#### `FreeLimitWarning`

**Path:** `components/subscription/free-limit-warning.tsx`

Componente que muestra avisos visuales cuando los usuarios se acercan o exceden límites.

**Props:**

```typescript
interface FreeLimitWarningProps {
  resources?: Array<keyof UsageStatus>; // Recursos a verificar
  onlyAtLimit?: boolean; // Si true, muestra solo al alcanzar 100%
}
```

**Umbrales:**

- **80-99%:** Warning (amarillo) - "Acercándote al límite"
- **100%+:** Error (rojo) - "Límite alcanzado"

**Uso:**

```tsx
// En dashboard - verifica todos los recursos
<FreeLimitWarning />

// En página específica - verifica solo transacciones
<FreeLimitWarning resources={['transactions']} />

// Solo cuando se alcanza el límite
<FreeLimitWarning onlyAtLimit={true} />
```

**Integrado en:**

- ✅ `components/dashboard/desktop-dashboard.tsx`
- ✅ `components/dashboard/mobile-dashboard.tsx`

#### `useCheckLimit` Hook

**Path:** `hooks/use-check-limit.ts`

Hook para validar límites antes de ejecutar acciones.

**API:**

```typescript
const { canPerformAction, checkLimit, redirectToUpgrade, isFree } = useCheckLimit();

// Verificar si puede realizar acción
if (!canPerformAction('transactions')) {
  // Mostrar mensaje o redirigir
  return;
}

// Verificar con mensaje personalizado
const result = checkLimit('transactions');
if (!result.allowed) {
  alert(result.message);
  if (result.canUpgrade) {
    redirectToUpgrade();
  }
}
```

**Ya integrado en:**

- ✅ `components/forms/transaction-form.tsx` (línea 119-122)
- ✅ `app/backups/page.tsx` (línea 64-67)

### 3. Backend Validation

#### `check-limit.ts`

**Path:** `lib/subscriptions/check-limit.ts`

Funciones de validación en el backend para asegurar que los límites se respeten incluso si el frontend es bypasseado.

**Funciones:**

```typescript
// Verificar si puede crear transacción
const result = await canCreateTransaction(userId);

// Verificar si puede crear backup
const result = await canCreateBackup(userId);

// Verificar si puede exportar
const result = await canExport(userId);

// Verificar si puede usar IA
const result = await canUseAI(userId);
```

**Respuesta:**

```typescript
interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number | 'unlimited';
}
```

**Integrado en:**

- ✅ `app/api/transactions/route.ts` (POST endpoint, línea 83-99)

## Flujo de Validación

### Creación de Transacción

1. **Usuario intenta crear transacción**

2. **Frontend (`transaction-form.tsx`):**
   ```typescript
   if (!transaction && tier === 'free' && isAtLimit('transactions')) {
     setShowUpgradeModal(true);
     return;
   }
   ```

3. **Backend (`app/api/transactions/route.ts`):**
   ```typescript
   const limitCheck = await canCreateTransaction(userId);
   if (!limitCheck.allowed) {
     return NextResponse.json({ 
       error: limitCheck.reason,
       limitReached: true 
     }, { status: 403 });
   }
   ```

4. **Si alcanza límite:**
   - Se muestra `UpgradeModal`
   - Usuario puede actualizar a plan de pago
   - Redirige a `/pricing`

### Visualización de Avisos

1. **Dashboard carga**

2. **`useSubscription` hook obtiene datos:**
   ```typescript
   const { isFree, usageStatus, isApproachingLimit, isAtLimit } = useSubscription();
   ```

3. **`FreeLimitWarning` evalúa:**
   - Si `isFree && usageStatus.transactions.percentage >= 80`
   - Muestra alerta amarilla (warning)
   - Si `percentage >= 100`, muestra alerta roja (error)

4. **Usuario puede:**
   - Click en "Actualizar plan" → va a `/pricing`
   - Continuar usando hasta alcanzar límite absoluto

## Casos de Uso

### Caso 1: Usuario cerca del límite

```
Usuario: 450/500 transacciones (90%)
Dashboard: Muestra warning amarillo
Acción: Puede seguir creando transacciones
Warning: "Has usado 450 de 500 transacciones (90% de tu plan gratuito)"
```

### Caso 2: Usuario alcanza límite

```
Usuario: 500/500 transacciones (100%)
Dashboard: Muestra error rojo
Acción: Al intentar crear transacción → UpgradeModal
API: Rechaza con 403 Forbidden
Error: "Has alcanzado el límite de 500 transacciones de tu plan gratuito"
```

### Caso 3: Usuario con plan de pago

```
Usuario: Plan Base o Premium
Dashboard: No muestra warnings
Acción: Sin límites
API: Permite todas las acciones
```

## Testing

### Test Manual

1. **Crear usuario free:**
   ```sql
   -- Verificar que no tiene subscription en tabla subscriptions
   SELECT * FROM subscriptions WHERE user_id = 'USER_ID';
   ```

2. **Simular uso alto:**
   ```sql
   UPDATE usage_tracking 
   SET transaction_count = 450 
   WHERE user_id = 'USER_ID';
   ```

3. **Verificar warning:**
   - Login como ese usuario
   - Ver dashboard → debe mostrar warning amarillo

4. **Alcanzar límite:**
   ```sql
   UPDATE usage_tracking 
   SET transaction_count = 500 
   WHERE user_id = 'USER_ID';
   ```

5. **Verificar bloqueo:**
   - Intentar crear transacción → debe mostrar UpgradeModal
   - Verificar que API rechace con 403

### Test Automatizado

```typescript
describe('FreeLimitWarning', () => {
  it('muestra warning al 80%', () => {
    // Mock useSubscription con 80% usage
    // Verificar que se renderiza Alert tipo warning
  });

  it('muestra error al 100%', () => {
    // Mock useSubscription con 100% usage
    // Verificar que se renderiza Alert tipo error
  });

  it('no muestra nada para usuarios pagos', () => {
    // Mock useSubscription con tier !== 'free'
    // Verificar que no se renderiza nada
  });
});

describe('useCheckLimit', () => {
  it('permite acción si no está en límite', () => {
    // Mock subscription con usage < 100%
    const { canPerformAction } = renderHook(() => useCheckLimit());
    expect(canPerformAction('transactions')).toBe(true);
  });

  it('bloquea acción si está en límite', () => {
    // Mock subscription con usage === 100%
    const { canPerformAction } = renderHook(() => useCheckLimit());
    expect(canPerformAction('transactions')).toBe(false);
  });
});

describe('API /api/transactions POST', () => {
  it('rechaza si usuario free alcanzó límite', async () => {
    // Mock canCreateTransaction que retorna allowed: false
    const response = await POST({ userId: 'free-user-at-limit', ... });
    expect(response.status).toBe(403);
    expect(response.json).toMatchObject({ limitReached: true });
  });

  it('permite si usuario tiene plan pago', async () => {
    // Mock canCreateTransaction que retorna allowed: true
    const response = await POST({ userId: 'paid-user', ... });
    expect(response.status).toBe(200);
  });
});
```

## Extensión Futura

### Agregar nuevos límites

1. **Actualizar `types/subscription.ts`:**
   ```typescript
   export const TIER_LIMITS = {
     free: {
       ...existing,
       newLimit: 100,
     }
   };
   ```

2. **Actualizar `UsageTracking` interface:**
   ```typescript
   interface UsageTracking {
     ...existing,
     newLimitCount: number,
   }
   ```

3. **Crear función de validación:**
   ```typescript
   export async function canUseNewFeature(userId: string): Promise<LimitCheckResult> {
     // Implementar lógica similar a otras funciones
   }
   ```

4. **Integrar en frontend:**
   - Agregar validación en formulario/acción
   - `FreeLimitWarning` automáticamente detecta nuevos recursos en `UsageStatus`

5. **Integrar en backend:**
   - Agregar validación en endpoint correspondiente

## Notas Importantes

- **Tracking mensual:** Los contadores se resetean cada mes (formato `YYYY-MM`)
- **Validación dual:** Siempre validar en frontend Y backend
- **UX first:** Mostrar warnings antes de bloquear (80% threshold)
- **Actualización:** Siempre ofrecer link a `/pricing` para actualizar
- **Performance:** `useSubscription` cachea datos, no hace fetch en cada render

## Archivos Modificados/Creados

### Nuevos Archivos

- ✅ `components/subscription/free-limit-warning.tsx`
- ✅ `hooks/use-check-limit.ts`
- ✅ `lib/subscriptions/check-limit.ts`
- ✅ `docs/FREE_USER_LIMITS_SYSTEM.md` (este archivo)

### Archivos Modificados

- ✅ `components/dashboard/desktop-dashboard.tsx` (agregado FreeLimitWarning)
- ✅ `components/dashboard/mobile-dashboard.tsx` (agregado FreeLimitWarning)
- ✅ `app/api/transactions/route.ts` (agregado validación backend)
- ✅ `hooks/index.ts` (export useCheckLimit)

### Archivos Existentes (sin cambios, ya tenían validación)

- ✅ `components/forms/transaction-form.tsx`
- ✅ `app/backups/page.tsx`
- ✅ `types/subscription.ts`
- ✅ `hooks/use-subscription.ts`
- ✅ `app/api/subscription/status/route.ts`

## Referencias

- [Subscription System Architecture](./SUBSCRIPTION_ARCHITECTURE.md)
- [LemonSqueezy Integration](./LEMON_SQUEEZY_PRICING_INTEGRATION.md)
- [Pricing Page](../app/pricing/page.tsx)
