# Fix para 404 en URL de LemonSqueezy - "Page Not Found"

## Problema

Después de resolver el error 500, ahora el checkout redirige a una URL de LemonSqueezy que da 404:

```
https://229057.lemonsqueezy.com/checkout/buy/1031352?checkout%5Bemail%5D=...

404: Page Not Found
Sorry, the page you are looking for could not be found.
```

## Causa Raíz

El problema está en que las variables de entorno estaban configuradas con **IDs numéricos** en lugar de **slugs**:

### ❌ Configuración Incorrecta

```bash
LEMONSQUEEZY_STORE_ID=229057  # ← ID numérico de la tienda
LEMONSQUEEZY_VARIANT_ID_BASE=1031352  # ← ID numérico del variant
```

Esta configuración genera una URL incorrecta:
```
https://229057.lemonsqueezy.com/checkout/buy/1031352
        ^^^^^^                             ^^^^^^^
        Store ID numérico                  Variant ID numérico
```

### ✅ Configuración Correcta

```bash
LEMONSQUEEZY_STORE_ID=fintec  # ← Slug de la tienda
LEMONSQUEEZY_VARIANT_ID_BASE=085044d4-3711-4313-bd18-8d43c24cdd36  # ← Slug de checkout
```

Esta configuración genera la URL correcta:
```
https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36
        ^^^^^^                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        Store slug                         Variant checkout slug
```

## Diferencia Entre IDs y Slugs

LemonSqueezy usa **dos tipos de identificadores**:

| Tipo | Uso | Ejemplo | Dónde se Usa |
|------|-----|---------|--------------|
| **ID Numérico** | API calls | `229057`, `1031352` | Llamadas a la API de LemonSqueezy |
| **Slug** | URLs públicas | `fintec`, `085044d4...` | URLs de checkout, webhooks |

### Store

- **Store ID (numérico):** `229057` → Usar para API calls
- **Store Slug:** `fintec` → Usar para URLs de checkout ✅

### Variant

- **Variant ID (numérico):** `1031352` → Usar para API calls
- **Checkout Slug:** `085044d4-3711-4313-bd18-8d43c24cdd36` → Usar para checkout URLs ✅

## Solución Implementada

### 1. Documentación Actualizada

Creé documentación clara sobre qué valores usar:

- ✅ `docs/ENV_VARIABLES_CORRECT_VALUES.md` - Guía completa de configuración
- ✅ `docs/LEMONSQUEEZY_REAL_CONFIG.md` - Actualizado con valores correctos

### 2. Comentarios en Configuración

El código ya está correcto en `lib/lemonsqueezy/checkout.ts` (línea 28):

```typescript
const baseUrl = `https://${lemonSqueezyConfig.storeId}.lemonsqueezy.com/checkout/buy/${variantId}`;
```

Este código funciona correctamente **si** las variables de entorno tienen los valores correctos.

## Valores Correctos Para FINTEC

### Variables de Entorno

```bash
# ✅ CORRECTO: Store Slug
LEMONSQUEEZY_STORE_ID=fintec

# ✅ CORRECTO: Checkout Slugs
LEMONSQUEEZY_VARIANT_ID_BASE=085044d4-3711-4313-bd18-8d43c24cdd36
LEMONSQUEEZY_VARIANT_ID_PREMIUM=ea09c700-e8ba-43fa-ab75-df56fd7875e2

# Estos SÍ son IDs numéricos (solo para API calls, no checkout)
LEMONSQUEEZY_PRODUCT_ID_BASE=656807
LEMONSQUEEZY_PRODUCT_ID_PREMIUM=656822
```

### URLs Finales Esperadas

**Plan Full (Base):**
```
https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36?checkout[email]=...
```

**Plan Premium IA:**
```
https://fintec.lemonsqueezy.com/checkout/buy/ea09c700-e8ba-43fa-ab75-df56fd7875e2?checkout[email]=...
```

## Cómo Obtener los Slugs Correctos

### Método 1: Dashboard de LemonSqueezy

1. Ve a **Products** → Selecciona tu producto
2. Ve a **Variants**
3. Click en el variant
4. Busca el campo "**Buy Now URL**" o "**Checkout Link**"
5. La URL será: `https://fintec.lemonsqueezy.com/checkout/buy/[SLUG]`
6. El `[SLUG]` es lo que necesitas

### Método 2: API de LemonSqueezy

```bash
curl -X GET 'https://api.lemonsqueezy.com/v1/variants/1031352' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

Respuesta:
```json
{
  "data": {
    "attributes": {
      "slug": "085044d4-3711-4313-bd18-8d43c24cdd36"  ← Este
    }
  }
}
```

### Método 3: URL de la Tienda

Tu store slug es el subdominio de tu tienda:
```
https://fintec.lemonsqueezy.com
        ^^^^^^
        Este es tu store slug
```

## Pasos para Aplicar el Fix

### 1. Actualizar Variables en Vercel

1. Ve a **Vercel Dashboard** → Tu Proyecto
2. **Settings** → **Environment Variables**
3. Encuentra y actualiza:

```
LEMONSQUEEZY_STORE_ID=fintec
LEMONSQUEEZY_VARIANT_ID_BASE=085044d4-3711-4313-bd18-8d43c24cdd36
LEMONSQUEEZY_VARIANT_ID_PREMIUM=ea09c700-e8ba-43fa-ab75-df56fd7875e2
```

4. **Redeploy** la aplicación

### 2. Actualizar Variables Locales

Crea/actualiza `.env.local`:

```bash
LEMONSQUEEZY_STORE_ID=fintec
LEMONSQUEEZY_VARIANT_ID_BASE=085044d4-3711-4313-bd18-8d43c24cdd36
LEMONSQUEEZY_VARIANT_ID_PREMIUM=ea09c700-e8ba-43fa-ab75-df56fd7875e2
```

### 3. Verificar Localmente

```bash
npm run dev
```

1. Ve a `/pricing`
2. Click en "Actualizar" para cualquier plan
3. Verifica la URL generada en la consola del navegador
4. Debe ser: `https://fintec.lemonsqueezy.com/checkout/buy/085044d4...`

### 4. Probar URLs Directamente

Abre estas URLs en tu navegador para verificar que funcionen:

**Plan Base:**
```
https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36
```

**Plan Premium:**
```
https://fintec.lemonsqueezy.com/checkout/buy/ea09c700-e8ba-43fa-ab75-df56fd7875e2
```

Si ambas URLs muestran el checkout de LemonSqueezy: ✅ **Configuración correcta!**

Si ves 404: ❌ Revisa los slugs

## Verificación Post-Deploy

### Checklist

- [ ] Variables actualizadas en Vercel con slugs correctos
- [ ] Deploy completado exitosamente
- [ ] URLs de checkout directas funcionan (sin 404)
- [ ] Flujo completo funciona desde `/pricing`
- [ ] Email del usuario llega correctamente a LemonSqueezy
- [ ] Trial de 14 días aparece en el checkout

### Test End-to-End

1. **Pricing Page:**
   - Ve a `https://fintec-six.vercel.app/pricing`
   - Verifica que se muestren los planes

2. **Checkout Page:**
   - Click en "Actualizar" para Plan Full
   - Debe ir a `/checkout?tier=base`
   - Verifica que se muestre información correcta

3. **LemonSqueezy:**
   - Click en "Proceder al Pago"
   - Debe redirigir a: `https://fintec.lemonsqueezy.com/checkout/buy/085044d4...`
   - Verifica que se muestre el checkout de LemonSqueezy (NO 404)
   - Email debe estar pre-llenado
   - Precio debe ser $5.99/mes
   - Trial debe mostrar "14 days free"

## Logs para Debugging

Si todavía ves 404, revisa los logs en la consola del navegador:

```javascript
[Checkout] Calling API with: { userId: "...", tier: "base", userEmail: "..." }
[Checkout] API response status: 200
[Checkout] Checkout URL received, redirecting...
```

La URL generada debe verse así:
```
https://fintec.lemonsqueezy.com/checkout/buy/085044d4-3711-4313-bd18-8d43c24cdd36?...
```

**No así:**
```
https://229057.lemonsqueezy.com/checkout/buy/1031352?...
```

## Resumen

### Problema
- URLs generadas con IDs numéricos → 404

### Solución  
- Usar slugs en vez de IDs numéricos en variables de entorno

### Archivos Actualizados
- ✅ `docs/ENV_VARIABLES_CORRECT_VALUES.md` - Nueva guía completa
- ✅ `docs/LEMONSQUEEZY_REAL_CONFIG.md` - Actualizado con valores correctos
- ✅ `docs/LEMONSQUEEZY_URL_404_FIX.md` - Este documento

### Próximo Paso del Usuario
1. Actualizar variables en Vercel con los slugs correctos
2. Redeploy
3. Probar el flujo completo

## Referencias

- [Guía de Variables de Entorno](./ENV_VARIABLES_CORRECT_VALUES.md)
- [Configuración Real de LemonSqueezy](./LEMONSQUEEZY_REAL_CONFIG.md)
- [Fix del Error 500](./CHECKOUT_500_ERROR_FIX.md)
- [Flujo Completo de Checkout](./LEMONSQUEEZY_CHECKOUT_FLOW.md)

