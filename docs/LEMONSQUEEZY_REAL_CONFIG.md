# Configuración Real de LemonSqueezy - FINTEC

## Información de la Tienda

- **Store ID:** `229057`
- **Nombre:** Fintec
- **URL:** https://fintec.lemonsqueezy.com
- **País:** Venezuela
- **Moneda:** USD
- **Plan:** Free
- **Modo:** Test Mode ✅ (todos los productos están en modo prueba)

## Productos Configurados

### 1. Plan Full (Base)

**Información del Producto:**
- **Product ID:** `656807`
- **Nombre:** Plan Full
- **Descripción:** Gestiona tus finanzas sin límites. Incluye transacciones ilimitadas, backups automáticos, reportes avanzados y soporte prioritario
- **Precio:** $5.99/mes
- **Status:** Published

**Información del Variant:**
- **Variant ID:** `1031352`
- **Slug/Checkout ID:** `085044d4-3711-4313-bd18-8d43c24cdd36`
- **Precio:** $5.99 (599 centavos)
- **Tipo:** Suscripción mensual
- **Trial Gratuito:** 14 días
- **Status:** Pending

**URLs:**
- **Checkout directo:** `https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36`

### 2. Plan Premium IA

**Información del Producto:**
- **Product ID:** `656822`
- **Nombre:** Plan Premiun IA
- **Descripción:** Desbloquea el poder de la IA en tus finanzas. Incluye categorización automática, predicciones, consejos y detección de anomalías.
- **Precio:** $9.99/mes
- **Status:** Published

**Información del Variant:**
- **Variant ID:** `1031375`
- **Slug/Checkout ID:** `ea09c700-e8ba-43fa-ab75-df56fd7875e2`
- **Precio:** $9.99 (999 centavos)
- **Tipo:** Suscripción mensual
- **Trial Gratuito:** 14 días
- **Status:** Pending

**URLs:**
- **Checkout directo:** `https://fintec.lemonsqueezy.com/checkout/buy/ea09c700-e8ba-43fa-ab75-df56fd7875e2`

## Variables de Entorno Necesarias

### Para Vercel (Production)

Configura estas variables en: Vercel Dashboard → Project Settings → Environment Variables

⚠️ **IMPORTANTE:** El `STORE_ID` debe ser el **slug** (`fintec`), NO el ID numérico (`229057`)

```bash
# LemonSqueezy
LEMONSQUEEZY_STORE_ID=fintec  # ← SLUG, no 229057
LEMONSQUEEZY_API_KEY=<tu-api-key>
LEMONSQUEEZY_WEBHOOK_SECRET=<tu-webhook-secret>
LEMONSQUEEZY_PRODUCT_ID_BASE=656807
LEMONSQUEEZY_PRODUCT_ID_PREMIUM=656822
LEMONSQUEEZY_VARIANT_ID_BASE=085044d4-3711-4313-bd18-8d43c24cdd36  # ← SLUG de checkout
LEMONSQUEEZY_VARIANT_ID_PREMIUM=ea09c700-e8ba-43fa-ab75-df56fd7875e2  # ← SLUG de checkout

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://lssnujnctuchowgrspvk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-supabase-anon-key>

# App
NEXT_PUBLIC_APP_URL=https://fintec-six.vercel.app
```

### Para Local (.env.local)

⚠️ **IMPORTANTE:** El `STORE_ID` debe ser el **slug** (`fintec`), NO el ID numérico (`229057`)

```bash
# LemonSqueezy
LEMONSQUEEZY_STORE_ID=fintec  # ← SLUG, no 229057
LEMONSQUEEZY_API_KEY=<tu-api-key>
LEMONSQUEEZY_WEBHOOK_SECRET=<tu-webhook-secret>
LEMONSQUEEZY_PRODUCT_ID_BASE=656807
LEMONSQUEEZY_PRODUCT_ID_PREMIUM=656822
LEMONSQUEEZY_VARIANT_ID_BASE=085044d4-3711-4313-bd18-8d43c24cdd36  # ← SLUG de checkout
LEMONSQUEEZY_VARIANT_ID_PREMIUM=ea09c700-e8ba-43fa-ab75-df56fd7875e2  # ← SLUG de checkout

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://lssnujnctuchowgrspvk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-supabase-anon-key>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Configuración de Webhooks

Para recibir notificaciones cuando un usuario compre o cancele una suscripción, necesitas configurar un webhook en LemonSqueezy.

### 1. Crear Webhook

1. Ve a: https://app.lemonsqueezy.com/settings/webhooks
2. Click en "+" o "Create webhook"
3. Configura:
   - **URL:** `https://fintec-six.vercel.app/api/lemonsqueezy/webhook`
   - **Signing Secret:** Genera uno y guárdalo en `LEMONSQUEEZY_WEBHOOK_SECRET`
   - **Events to listen:**
     - `subscription_created`
     - `subscription_updated`
     - `subscription_cancelled`
     - `subscription_resumed`
     - `subscription_expired`
     - `order_created`

### 2. Verificar Webhook

El endpoint `/api/lemonsqueezy/webhook` ya está implementado y verifica:
- La firma del webhook usando el secret
- El tipo de evento
- Actualiza la suscripción en Supabase

## URLs de Checkout Generadas

La aplicación genera URLs de checkout con los siguientes parámetros:

```
https://fintec.lemonsqueezy.com/checkout/buy/{variant-id}?
  checkout[email]={user-email}&
  checkout[custom][user_data]={"userId":"{user-id}"}
```

Ejemplo para Plan Full:
```
https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36?checkout[email]=user@example.com&checkout[custom][user_data]={"userId":"123"}
```

## Flujo de Compra

1. Usuario en `/pricing` selecciona un plan
2. Redirige a `/checkout?tier=base` (o `premium`)
3. Página de checkout muestra detalles y llama a `/api/lemonsqueezy/checkout`
4. API genera URL de LemonSqueezy con datos del usuario
5. Usuario es redirigido a LemonSqueezy
6. Usuario completa el pago (con trial de 14 días)
7. LemonSqueezy redirige a `/subscription/success`
8. Webhook de LemonSqueezy actualiza suscripción en Supabase

## Test Mode

🚨 **IMPORTANTE:** Todos los productos están en **Test Mode**.

**Esto significa:**
- Las transacciones no son reales
- No se cobran tarjetas de crédito reales
- Puedes usar tarjetas de prueba de LemonSqueezy
- Los webhooks funcionan normalmente

**Para activar modo producción:**
1. Activa los productos en el dashboard de LemonSqueezy
2. Configura un método de pago real para tu cuenta
3. Verifica que los webhooks apunten a la URL de producción
4. Prueba con una tarjeta real en pequeña cantidad

**Tarjetas de prueba:**
- **Éxito:** `4242 4242 4242 4242`
- **CVV:** Cualquier 3 dígitos
- **Fecha:** Cualquier fecha futura
- **ZIP:** Cualquier código postal

## Monitoreo

### Dashboard de LemonSqueezy

Monitorea:
- Nuevas suscripciones
- Renovaciones
- Cancelaciones
- Ingresos
- Webhooks (estado y payloads)

URL: https://app.lemonsqueezy.com/dashboard

### Vercel Logs

Para ver logs del API y webhooks:
1. Vercel Dashboard → Project → Deployments
2. Click en último deployment
3. Functions tab
4. Busca `/api/lemonsqueezy/checkout` y `/api/lemonsqueezy/webhook`

### Supabase

Verifica las suscripciones en la tabla `subscriptions`:
1. Supabase Dashboard → Table Editor
2. Tabla `subscriptions`
3. Busca por `lemonSqueezySubscriptionId` o `userId`

## Troubleshooting

### Checkout retorna 404
- ✅ Verifica que las env vars estén configuradas en Vercel
- ✅ Clear build cache en Vercel
- ✅ Verifica logs de función en Vercel
- ✅ Usa el endpoint de health check: `/api/lemonsqueezy/checkout` (GET)

### Webhook no se recibe
- ✅ Verifica URL del webhook en LemonSqueezy dashboard
- ✅ Verifica que el signing secret sea correcto
- ✅ Revisa logs del webhook en LemonSqueezy dashboard
- ✅ Verifica logs en Vercel Functions

### Precios no coinciden
- ✅ Los precios en `types/subscription.ts` deben estar en centavos
- ✅ `TIER_FEATURES.base.price = 599` ($5.99)
- ✅ `TIER_FEATURES.premium.price = 999` ($9.99)

## Referencias

- **LemonSqueezy API Docs:** https://docs.lemonsqueezy.com/api
- **Dashboard:** https://app.lemonsqueezy.com/dashboard
- **Webhooks:** https://docs.lemonsqueezy.com/help/webhooks
- **Test Mode:** https://docs.lemonsqueezy.com/help/getting-started/test-mode
