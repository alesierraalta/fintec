# Configuración de Productos Paddle para Tres Planes

## Resumen

Tu aplicación soporta tres planes de suscripción:
1. **Gratis** (`free`) - $0.00/mes - No requiere Paddle
2. **Plan Full** (`base`) - $5.99/mes - Requiere producto en Paddle
3. **Plan Premium IA** (`premium`) - $9.99/mes - Requiere producto en Paddle

## Problema Actual

En Supabase solo aparece una suscripción (premium), pero necesitas tener configurados **dos productos en Paddle**:
- **Plan Full** (base) - Producto faltante o mal configurado
- **Plan Premium IA** (premium) - Ya existe pero necesita verificación

## Pasos para Configurar Productos en Paddle

### Paso 1: Verificar Productos Existentes

1. Accede al [Dashboard de Paddle](https://vendors.paddle.com/)
2. Ve a **Catalog** → **Products**
3. Verifica qué productos tienes:
   - ¿Tienes un producto llamado "Plan Full" o similar?
   - ¿Tienes un producto llamado "Premium IA" o "Premium" o similar?
   - Anota los **Product IDs** de cada uno

### Paso 2: Crear Producto "Plan Full" (si no existe)

Si no tienes el producto para "Plan Full":

1. En Paddle Dashboard → **Catalog** → **Products** → **Create Product**
2. Configuración:
   - **Name**: `Plan Full` o `Fintec - Plan Full`
   - **Description**: `Plan Full con transacciones ilimitadas, historial completo y funciones avanzadas`
   - **Status**: `Active`
3. Click **Create Product**
4. **Anota el Product ID** (formato: `pro_xxxxxxxxxxxxx`)

### Paso 3: Crear Precio para "Plan Full"

1. En el producto recién creado, click **Add Price**
2. Configuración:
   - **Type**: `Recurring`
   - **Billing Period**: `Monthly`
   - **Unit Price**: `$5.99` (USD)
   - **Tax Mode**: `Account Setting` (o según tu configuración)
   - **Status**: `Active`
3. Click **Create Price**
4. **Anota el Price ID** (formato: `pri_xxxxxxxxxxxxx`)

### Paso 4: Verificar Producto "Premium IA"

1. En Paddle Dashboard → **Catalog** → **Products**
2. Busca tu producto Premium
3. Verifica que tenga:
   - **Name**: Debe contener "premium" o "ia" o "Premium IA"
   - **Status**: `Active`
   - **Al menos un precio activo** con valor $9.99/mes
4. **Anota el Product ID y Price ID**

### Paso 5: Actualizar Variables de Entorno

Una vez que tengas los IDs, actualiza tu archivo `.env.local` o variables de entorno en Vercel:

```bash
# Product IDs
PADDLE_PRODUCT_ID_BASE=pro_01k8x6ja17xqv32ac3qjtp4xw3  # Reemplazar con el ID real de Plan Full
PADDLE_PRODUCT_ID_PREMIUM=pro_01k8x6n2qj1dvf4t1jrfewbfjm  # Reemplazar con el ID real de Premium IA

# Price IDs
PADDLE_PRICE_ID_BASE=pri_01k8x7fz95gfheftb3tqg704ck  # Reemplazar con el Price ID de Plan Full
PADDLE_PRICE_ID_PREMIUM=pri_01k8x7efr9tafdgdfeyj72xx6c  # Reemplazar con el Price ID de Premium IA
```

**Importante**: Reemplaza los IDs de ejemplo con los IDs reales de tus productos en Paddle.

### Paso 6: Verificar Configuración

#### Opción A: Verificar desde la API

Ejecuta en tu aplicación:

```bash
# En desarrollo local
curl http://localhost:3000/api/paddle/products

# O desde el navegador
# http://localhost:3000/api/paddle/products
```

Deberías ver un JSON con ambos productos (base y premium).

#### Opción B: Verificar desde la Página de Pricing

1. Ve a `/pricing` en tu aplicación
2. Deberías ver **tres cards**:
   - Gratis ($0.00/mes)
   - Plan Full ($5.99/mes)
   - Premium IA ($9.99/mes)

### Paso 7: Verificar en Supabase

Después de configurar correctamente Paddle, los usuarios deberían poder suscribirse a cualquiera de los dos planes pagos, y deberías ver suscripciones con tier `base` y `premium` en Supabase.

Ejecuta esta query en Supabase para verificar:

```sql
-- Ver distribución de tiers
SELECT 
    tier,
    status,
    COUNT(*) as count
FROM subscriptions
GROUP BY tier, status
ORDER BY tier, status;
```

## Estructura Esperada

### En Paddle Dashboard

Deberías tener **2 productos activos**:

1. **Plan Full** (`base`)
   - Product ID: `pro_xxxxx`
   - Price ID: `pri_xxxxx` 
   - Precio: $5.99/mes (USD)
   - Status: Active

2. **Premium IA** (`premium`)
   - Product ID: `pro_xxxxx`
   - Price ID: `pri_xxxxx`
   - Precio: $9.99/mes (USD)
   - Status: Active

### En Supabase Database

Deberías poder tener suscripciones con tres tiers:
- `free` - Usuarios sin suscripción activa (default)
- `base` - Usuarios suscritos a Plan Full
- `premium` - Usuarios suscritos a Premium IA

### En el Código

El código ya está preparado para manejar los tres tiers. Solo necesitas:
1. ✅ Tener ambos productos creados en Paddle
2. ✅ Tener los Product IDs y Price IDs correctos en las variables de entorno
3. ✅ Asegurar que los nombres de productos en Paddle contengan "full" o "base" para base, y "premium" o "ia" para premium

## Mapeo de Nombres

El código busca productos en Paddle usando estos patrones:

```typescript
// Para base
name.includes('base') || name.includes('full')

// Para premium  
name.includes('premium') || name.includes('ia')
```

**Recomendación**: Asegúrate de que los nombres de tus productos en Paddle contengan estas palabras para que el mapeo funcione correctamente.

## Troubleshooting

### Problema: Solo aparece Premium en la página de pricing

**Solución**:
1. Verifica que tengas **dos productos activos** en Paddle
2. Verifica que ambos productos tengan **precios activos**
3. Verifica que el Product ID Base esté correcto en `.env.local`
4. Verifica que la API `/api/paddle/products` retorne ambos productos

### Problema: No puedo suscribirme a Base

**Solución**:
1. Verifica que el Price ID Base esté correcto en `.env.local`
2. Verifica que el precio en Paddle esté activo
3. Revisa los logs del servidor al hacer checkout

### Problema: Los productos no se mapean correctamente

**Solución**:
1. Asegúrate de que el nombre del producto en Paddle contenga:
   - "full" o "base" para Plan Full
   - "premium" o "ia" para Premium IA
2. O modifica `components/subscription/pricing-cards.tsx` para usar Product IDs directamente en lugar de nombres

## Referencias

- [Paddle Dashboard](https://vendors.paddle.com/)
- [Paddle Products API](https://developer.paddle.com/api-reference/product-api/products)
- Archivo de configuración: `lib/paddle/config.ts`
- Componente de pricing: `components/subscription/pricing-cards.tsx`

