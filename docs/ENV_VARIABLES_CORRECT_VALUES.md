# Variables de Entorno Correctas para LemonSqueezy

## ⚠️ PROBLEMA COMÚN: IDs vs Slugs

LemonSqueezy usa **IDs numéricos** para la API pero **slugs** para las URLs de checkout.

### ❌ Error Común (genera 404)

```bash
LEMONSQUEEZY_STORE_ID=229057  # ← MAL: ID numérico
LEMONSQUEEZY_VARIANT_ID_BASE=1031352  # ← MAL: ID numérico
```

Esto genera URL incorrecta:
```
https://229057.lemonsqueezy.com/checkout/buy/1031352
                                                  
Resultado: 404 Page Not Found ❌
```

### ✅ Configuración Correcta

```bash
LEMONSQUEEZY_STORE_ID=fintec  # ← BIEN: slug de la tienda
LEMONSQUEEZY_VARIANT_ID_BASE=085044d4-3711-4313-bd18-8d43c24cdd36  # ← BIEN: checkout slug
LEMONSQUEEZY_VARIANT_ID_PREMIUM=ea09c700-e8ba-43fa-ab75-df56fd7875e2
```

Esto genera URL correcta:
```
https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36
                                                  
Resultado: Checkout funcional ✅
```

## Variables Completas

### Para Local (.env.local)

```bash
# Store Slug (nombre de la tienda en la URL)
LEMONSQUEEZY_STORE_ID=fintec

# API Key
LEMONSQUEEZY_API_KEY=<tu-api-key-desde-lemonsqueezy-settings>

# Webhook Secret
LEMONSQUEEZY_WEBHOOK_SECRET=<tu-webhook-secret>

# Product IDs (IDs numéricos para llamadas API)
LEMONSQUEEZY_PRODUCT_ID_BASE=656807
LEMONSQUEEZY_PRODUCT_ID_PREMIUM=656822

# Variant Slugs (slugs para checkout URLs)
LEMONSQUEEZY_VARIANT_ID_BASE=085044d4-3711-4313-bd18-8d43c24cdd36
LEMONSQUEEZY_VARIANT_ID_PREMIUM=ea09c700-e8ba-43fa-ab75-df56fd7875e2

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://lssnujnctuchowgrspvk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-supabase-anon-key>

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Para Vercel (Producción)

Las mismas variables, pero cambiar:
```bash
NEXT_PUBLIC_APP_URL=https://fintec-six.vercel.app
```

## ¿Cómo Obtener los Valores Correctos?

### 1. Store Slug

**Desde la URL de tu tienda:**
- URL: `https://fintec.lemonsqueezy.com`
- Slug: `fintec` ✅

**NO uses:**
- Store ID numérico: `229057` ❌

### 2. Variant Slugs (Checkout Slugs)

**Opción A: Desde la API de LemonSqueezy**

```bash
curl -X GET 'https://api.lemonsqueezy.com/v1/variants/1031352' \
  -H 'Accept: application/vnd.api+json' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

Respuesta:
```json
{
  "data": {
    "id": "1031352",
    "attributes": {
      "slug": "085044d4-3711-4313-bd18-8d43c24cdd36"  ← Este es el que necesitas
    }
  }
}
```

**Opción B: Desde el Dashboard**

1. Ve a Products → Selecciona tu producto
2. Ve a la pestaña de Variants
3. Click en el variant
4. Busca el campo "Slug" o "Checkout URL"
5. El slug es el UUID al final de la URL

**Opción C: Desde la URL de compra directa**

Si ya tienes un "Buy Now" link:
```
https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36
                                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                  Este es el slug que necesitas
```

## Referencia Rápida - Tu Configuración

### Plan Full (Base)

```bash
LEMONSQUEEZY_VARIANT_ID_BASE=085044d4-3711-4313-bd18-8d43c24cdd36
```

- ✅ Checkout Slug: `085044d4-3711-4313-bd18-8d43c24cdd36`
- ❌ NO uses Variant ID: `1031352`
- ✅ URL correcta: `https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36`
- Precio: $5.99/mes
- Trial: 14 días

### Plan Premium IA

```bash
LEMONSQUEEZY_VARIANT_ID_PREMIUM=ea09c700-e8ba-43fa-ab75-df56fd7875e2
```

- ✅ Checkout Slug: `ea09c700-e8ba-43fa-ab75-df56fd7875e2`
- ❌ NO uses Variant ID: `1031375`
- ✅ URL correcta: `https://fintec.lemonsqueezy.com/checkout/buy/ea09c700-e8ba-43fa-ab75-df56fd7875e2`
- Precio: $9.99/mes
- Trial: 14 días

## Verificación

### Test Manual

Prueba estas URLs directamente en tu navegador:

**Plan Base:**
```
https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36
```

**Plan Premium:**
```
https://fintec.lemonsqueezy.com/checkout/buy/ea09c700-e8ba-43fa-ab75-df56fd7875e2
```

Si ambas URLs abren el checkout de LemonSqueezy, ¡tus valores son correctos! ✅

Si ves "404 Page Not Found", revisa que estés usando los slugs correctos. ❌

### Test Programático

```typescript
// Debe generar URL con slug, no ID numérico
const url = getBaseCheckoutUrl('test@example.com', 'user-123');
console.log(url);

// ✅ Correcto:
// https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36?...

// ❌ Incorrecto:
// https://229057.lemonsqueezy.com/checkout/buy/1031352?...
```

## Actualizar en Vercel

1. Ve a Vercel Dashboard → Tu Proyecto
2. Settings → Environment Variables
3. Actualiza estas variables:

```
LEMONSQUEEZY_STORE_ID=fintec  (cambiar de 229057)
LEMONSQUEEZY_VARIANT_ID_BASE=085044d4-3711-4313-bd18-8d43c24cdd36  (cambiar de 1031352 si lo tenías)
LEMONSQUEEZY_VARIANT_ID_PREMIUM=ea09c700-e8ba-43fa-ab75-df56fd7875e2  (cambiar de 1031375 si lo tenías)
```

4. Redeploy la aplicación

## Referencias

- [Documentación de fix 404](./CHECKOUT_500_ERROR_FIX.md)
- [Configuración completa](./LEMONSQUEEZY_REAL_CONFIG.md)
- [LemonSqueezy API Docs](https://docs.lemonsqueezy.com/api)

