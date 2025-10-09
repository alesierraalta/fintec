# LemonSqueezy Checkout Flow - Documentación Completa

## Resumen

Este documento describe el flujo completo de compra de planes (subscription checkout) implementado en la aplicación FINTEC, que incluye una página de checkout intermedia antes de redirigir a Lemon Squeezy para el procesamiento de pagos.

## Arquitectura del Flujo

### Flujo de Usuario

```
1. Usuario en /pricing
   ↓
2. Click en "Actualizar" → useUpgrade hook
   ↓
3. Redirección a /checkout?tier=base|premium
   ↓
4. Revisión de detalles del plan
   ↓
5. Click en "Proceder al Pago"
   ↓
6. POST a /api/lemonsqueezy/checkout
   ↓
7. Redirección a Lemon Squeezy checkout URL
   ↓
8. Usuario completa pago en Lemon Squeezy
   ↓
9. Redirección a /subscription/success
   ↓
10. Webhook actualiza la suscripción en BD
```

## Componentes del Sistema

### 1. Página de Pricing (`app/pricing/page.tsx`)

**Responsabilidad:** Mostrar los planes disponibles y permitir al usuario seleccionar uno.

**Componentes:**
- `PricingCards`: Muestra las tarjetas de planes
- `useSubscription`: Hook para obtener el tier actual del usuario
- `useUpgrade`: Hook para iniciar el proceso de upgrade

**Flujo:**
```tsx
const { upgrade, loading } = useUpgrade();

const handleSelectTier = async (selectedTier: 'base' | 'premium') => {
  if (!user) {
    router.push('/auth/login');
    return;
  }
  await upgrade(selectedTier); // Redirige a /checkout
};
```

### 2. Hook useUpgrade (`hooks/use-subscription.ts`)

**Responsabilidad:** Gestionar la navegación hacia la página de checkout.

**Cambio Implementado:**
- **Antes:** Llamaba directamente a `/api/lemonsqueezy/checkout` y redirigía a Lemon Squeezy
- **Ahora:** Redirige a `/checkout?tier={tier}` para que el usuario revise los detalles

**Código:**
```typescript
export function useUpgrade() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgrade = useCallback(async (tier: 'base' | 'premium') => {
    if (!user?.id) {
      setError('User not authenticated');
      router.push(`/auth/login?returnTo=/checkout?tier=${tier}`);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Redirect to checkout page
      router.push(`/checkout?tier=${tier}`);
      return null;
    } catch (error: any) {
      setError(error.message || 'Failed to initiate upgrade');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, router]);

  return { upgrade, loading, error };
}
```

### 3. Página de Checkout (`app/checkout/page.tsx`)

**Responsabilidad:** Mostrar los detalles del plan y procesar el pago.

**Características:**
- Muestra información del plan seleccionado (nombre, precio, características)
- Valida que el usuario esté autenticado
- Valida que el tier sea válido (base o premium)
- Muestra el email del usuario
- Botón "Proceder al Pago" que llama al API
- Manejo de estados: loading, error
- Badges de seguridad

**Estados de la Página:**

1. **Loading inicial:** Mientras se valida el tier y el usuario
2. **Error (tier inválido):** Si el parámetro tier no es válido
3. **Redirección a login:** Si el usuario no está autenticado
4. **Mostrar detalles:** Estado normal con información del plan
5. **Processing payment:** Mientras se llama al API
6. **Error de API:** Si falla la llamada al API

**Validaciones:**
```typescript
// Validar tier
if (!tierParam || (tierParam !== 'base' && tierParam !== 'premium')) {
  setError('Plan no válido');
  return;
}

// Validar autenticación
if (!user?.id) {
  router.push(`/auth/login?returnTo=/checkout?tier=${tierParam}`);
  return;
}
```

**Llamada al API:**
```typescript
const handleProceedToPayment = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/lemonsqueezy/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, tier }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'No se pudo crear la sesión de pago');
    }

    const { url } = await response.json();
    
    if (url) {
      window.location.href = url; // Redirigir a Lemon Squeezy
    }
  } catch (error: any) {
    setError(error.message);
    setLoading(false);
  }
};
```

### 4. API Endpoint (`app/api/lemonsqueezy/checkout/route.ts`)

**Responsabilidad:** Generar la URL de checkout de Lemon Squeezy.

**Request:**
```json
{
  "userId": "user-uuid",
  "tier": "base" | "premium"
}
```

**Response (Success):**
```json
{
  "url": "https://store.lemonsqueezy.com/checkout/buy/variant-id?..."
}
```

**Response (Error):**
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

**Proceso:**
1. Valida userId y tier
2. Obtiene datos del usuario de Supabase (email, name)
3. Genera URL de checkout con `getBaseCheckoutUrl` o `getPremiumCheckoutUrl`
4. Retorna la URL

**Logging:**
El endpoint ahora incluye logging detallado para debugging:
```typescript
console.log('[LemonSqueezy Checkout] POST request received');
console.log('[LemonSqueezy Checkout] Request body:', { userId, tier });
console.log('[LemonSqueezy Checkout] Fetching user data from Supabase...');
// ... más logs
```

### 5. Funciones de Checkout (`lib/lemonsqueezy/checkout.ts`)

**Funciones principales:**

```typescript
// Generar URL para plan Base
getBaseCheckoutUrl(userEmail?: string, userId?: string): string

// Generar URL para plan Premium
getPremiumCheckoutUrl(userEmail?: string, userId?: string): string

// Función genérica
getCheckoutUrl(options: CheckoutOptions): string
```

**Parámetros de la URL:**
- `checkout[email]`: Email del usuario
- `checkout[name]`: Nombre del usuario
- `checkout[custom][user_data]`: JSON con userId y datos personalizados

### 6. Página de Éxito (`app/subscription/success/page.tsx`)

**Responsabilidad:** Confirmar el pago exitoso y dar siguiente paso.

**Parámetros de URL:**
- `session_id`: ID de la sesión de Lemon Squeezy (opcional)

**Flujo:**
1. Verifica session_id (si existe)
2. Espera 3 segundos para que el webhook procese
3. Muestra mensaje de éxito
4. Ofrece botones para ir al dashboard o ver suscripción

## Tipos y Configuración

### Tipos de Subscription (`types/subscription.ts`)

```typescript
type SubscriptionTier = 'free' | 'base' | 'premium';

interface TierFeatures {
  name: string;
  price: number; // en centavos
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  highlighted?: boolean;
}

const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  base: {
    name: 'Base',
    price: 499, // $4.99
    currency: 'USD',
    interval: 'month',
    features: [
      'Todo lo de Gratis',
      'Transacciones ilimitadas',
      'Historial completo (ilimitado)',
      // ... más features
    ],
  },
  // ...
};
```

### Configuración de Lemon Squeezy (`lib/lemonsqueezy/config.ts`)

**Variables de entorno requeridas:**
```
LEMONSQUEEZY_API_KEY=your-api-key
LEMONSQUEEZY_STORE_ID=your-store-id
LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-secret
LEMONSQUEEZY_VARIANT_ID_BASE=variant-id-for-base-plan
LEMONSQUEEZY_VARIANT_ID_PREMIUM=variant-id-for-premium-plan
NEXT_PUBLIC_APP_URL=https://your-app-url.com
```

## Pruebas

### Test E2E (`tests/24-checkout-flow-complete.spec.ts`)

**Casos de prueba:**
1. ✅ Navegación desde pricing a checkout
2. ✅ Visualización correcta de información del plan (Base)
3. ✅ Visualización correcta de información del plan (Premium)
4. ✅ Error para tier inválido
5. ✅ Redirección a login para usuarios no autenticados
6. ✅ Llamada al API cuando se procede al pago
7. ✅ Manejo de errores del API
8. ✅ Botón de volver a pricing
9. ✅ Mostrar todas las features del plan
10. ✅ Mostrar badges de seguridad
11. ✅ Envío correcto de datos al API

**Ejecutar pruebas:**
```bash
# Todas las pruebas de checkout
npx playwright test tests/24-checkout-flow-complete.spec.ts

# Modo headed (ver el navegador)
npx playwright test tests/24-checkout-flow-complete.spec.ts --headed

# Modo debug
npx playwright test tests/24-checkout-flow-complete.spec.ts --debug
```

### Test del API (`scripts/test-checkout-endpoint.ts`)

**Ejecutar:**
```bash
# Test local
npx tsx scripts/test-checkout-endpoint.ts

# Test en producción
TEST_URL=https://fintec-six.vercel.app npx tsx scripts/test-checkout-endpoint.ts
```

## Deployment y Verificación

### Checklist de Deployment

1. **Variables de Entorno en Vercel:**
   - ✅ `LEMONSQUEEZY_API_KEY`
   - ✅ `LEMONSQUEEZY_STORE_ID`
   - ✅ `LEMONSQUEEZY_WEBHOOK_SECRET`
   - ✅ `LEMONSQUEEZY_VARIANT_ID_BASE`
   - ✅ `LEMONSQUEEZY_VARIANT_ID_PREMIUM`
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ✅ `NEXT_PUBLIC_APP_URL`

2. **Build y Deploy:**
   ```bash
   npm run build
   git add .
   git commit -m "feat: implement complete checkout flow with intermediate page"
   git push origin main
   ```

3. **Verificación Post-Deploy:**
   ```bash
   # Health check
   curl https://fintec-six.vercel.app/api/lemonsqueezy/checkout
   
   # Test endpoint
   curl https://fintec-six.vercel.app/api/lemonsqueezy/checkout/test
   ```

4. **Tests E2E en Producción:**
   ```bash
   TEST_URL=https://fintec-six.vercel.app npm run test:e2e
   ```

### Debugging en Vercel

1. **Ver logs del API:**
   - Vercel Dashboard → Deployments → Functions
   - Buscar `/api/lemonsqueezy/checkout`
   - Ver logs con prefijo `[LemonSqueezy Checkout]`

2. **Errores comunes:**
   - `404`: Route no desplegada → Clear cache y redeploy
   - `500` con "User not found": Verificar Supabase credentials
   - `500` con "Missing variant ID": Verificar env vars de Lemon Squeezy

## Seguridad

### Validaciones Implementadas

1. **Autenticación:**
   - Verificar usuario autenticado antes de proceder
   - Redirigir a login si no está autenticado
   - Incluir returnTo para volver después del login

2. **Validación de Tier:**
   - Solo acepta "base" o "premium"
   - Retorna error 400 para valores inválidos

3. **Datos del Usuario:**
   - Verificar que el userId existe en Supabase
   - Obtener email del usuario de la BD (no confiar en cliente)

4. **Procesamiento de Pago:**
   - Todo el pago se procesa en Lemon Squeezy (PCI compliant)
   - No se maneja información de tarjetas en nuestra app

### Best Practices

1. **No exponer información sensible:**
   - No incluir API keys en el cliente
   - No incluir datos de pago en logs

2. **Validar en ambos lados:**
   - Cliente: Validación de UI
   - Servidor: Validación en API endpoint

3. **Manejo de errores:**
   - Mensajes de error descriptivos pero no revelar detalles internos
   - Logging detallado en servidor para debugging

## Mantenimiento

### Actualizar Precios

1. Actualizar en Lemon Squeezy Dashboard
2. Actualizar `TIER_FEATURES` en `types/subscription.ts`
3. Verificar que los variant IDs sean correctos

### Agregar Nuevo Plan

1. Crear producto y variant en Lemon Squeezy
2. Agregar env var `LEMONSQUEEZY_VARIANT_ID_NEW_PLAN`
3. Agregar tier a `SubscriptionTier` type
4. Agregar configuración a `TIER_FEATURES`
5. Actualizar `PricingCards` component
6. Actualizar validaciones en checkout

### Monitoreo

**Métricas a monitorear:**
- Tasa de conversión: pricing → checkout → pago completado
- Errores en API checkout
- Tiempo de respuesta del API
- Webhooks fallidos de Lemon Squeezy

## Referencias

- [Lemon Squeezy API Documentation](https://docs.lemonsqueezy.com/api)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Playwright Testing](https://playwright.dev)
- Documentación interna: `docs/LEMONSQUEEZY_CHECKOUT_404_FIX.md`
