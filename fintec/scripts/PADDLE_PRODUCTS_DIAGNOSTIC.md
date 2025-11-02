# Diagnóstico de Productos Paddle

## Estado Actual

En Supabase hay:
- **2 usuarios** con tier `free`
- **1 usuario** con tier `premium`

**Problema reportado**: Solo aparece una suscripción "premium" en Supabase, pero tu aplicación tiene 3 planes (Gratis, Plan Full, Premium IA).

## Análisis

### 1. El Código Ya Soporta Tres Tiers

El código está correctamente configurado para manejar:
- `free` - Plan Gratis ($0.00/mes)
- `base` - Plan Full ($5.99/mes)  
- `premium` - Plan Premium IA ($9.99/mes)

### 2. Configuración en `lib/paddle/config.ts`

Product IDs configurados (con valores por defecto):
- **Plan Full (base)**: `pro_01k8x6ja17xqv32ac3qjtp4xw3`
- **Premium IA (premium)**: `pro_01k8x6n2qj1dvf4t1jrfewbfjm`

Price IDs configurados:
- **Plan Full (base)**: `pri_01k8x7fz95gfheftb3tqg704ck`
- **Premium IA (premium)**: `pri_01k8x7efr9tafdgdfeyj72xx6c`

### 3. Mejora Implementada

He actualizado `components/subscription/pricing-cards.tsx` para:
1. **Primero buscar por Product ID** (más confiable que buscar por nombre)
2. **Fallback a búsqueda por nombre** si el Product ID no coincide

Esto asegura que si tienes ambos productos en Paddle, se mapeen correctamente.

## Verificación en Paddle Dashboard

Para verificar qué productos tienes realmente:

1. **Accede a Paddle Dashboard**: https://vendors.paddle.com/
2. **Ve a Catalog → Products**
3. **Verifica**:
   - ¿Cuántos productos activos tienes?
   - ¿Cuáles son sus nombres exactos?
   - ¿Cuáles son sus Product IDs?

4. **Para cada producto**:
   - ¿Tiene al menos un precio activo?
   - ¿Cuál es el Price ID del precio mensual?

## Verificación en tu Aplicación

### Opción 1: Verificar desde la API

Visita en tu navegador o con curl:

```
http://localhost:3000/api/paddle/products
```

Deberías ver un JSON con los productos de Paddle. Si solo aparece uno, entonces solo hay un producto configurado en Paddle.

### Opción 2: Verificar desde la Página de Pricing

1. Ve a `/pricing` en tu aplicación
2. Deberías ver **tres cards**:
   - Gratis ($0.00/mes) - Siempre visible
   - Plan Full ($5.99/mes) - Solo si hay producto en Paddle
   - Premium IA ($9.99/mes) - Solo si hay producto en Paddle

Si solo ves dos cards (Gratis y Premium), significa que **falta el producto "Plan Full"** en Paddle.

## Solución

### Si Falta el Producto "Plan Full"

1. **Crear producto en Paddle**:
   - Nombre: "Plan Full" o "Fintec - Plan Full"
   - Precio: $5.99/mes (recurring, monthly)
   - Status: Active

2. **Anotar IDs**:
   - Product ID (formato: `pro_xxxxx`)
   - Price ID (formato: `pri_xxxxx`)

3. **Actualizar variables de entorno**:
   ```bash
   PADDLE_PRODUCT_ID_BASE=tu_product_id_real_aqui
   PADDLE_PRICE_ID_BASE=tu_price_id_real_aqui
   ```

4. **Reiniciar aplicación** si es necesario

### Si Ambos Productos Existen pero no se Mapean

El código mejorado ahora busca primero por Product ID, así que si los Product IDs en `.env.local` coinciden con los de Paddle, deberían mapearse automáticamente.

Si aún no funciona:
1. Verifica que los Product IDs en `.env.local` coincidan exactamente con los de Paddle
2. Verifica que los productos en Paddle tengan precios activos
3. Revisa la consola del navegador en `/pricing` para ver errores

## Comandos Útiles

### Verificar productos en Supabase

```sql
-- Ver distribución de tiers
SELECT 
    subscription_tier,
    subscription_status,
    COUNT(*) as count
FROM users
GROUP BY subscription_tier, subscription_status;

-- Ver suscripciones activas
SELECT 
    tier,
    status,
    COUNT(*) as count
FROM subscriptions
WHERE status = 'active'
GROUP BY tier, status;
```

### Debug desde la aplicación

Abre la consola del navegador en `/pricing` y verifica:
- ¿Se están cargando productos de Paddle?
- ¿Cuántos productos retorna la API?
- ¿Hay errores en la consola?

## Próximos Pasos

1. **Verifica en Paddle Dashboard** cuántos productos tienes realmente
2. **Crea el producto "Plan Full"** si falta
3. **Actualiza las variables de entorno** con los IDs reales
4. **Verifica en `/pricing`** que aparezcan los tres planes
5. **Prueba suscribirte al plan base** para verificar que funciona

Si después de estos pasos aún hay problemas, comparte:
- Los Product IDs reales de tus productos en Paddle
- La respuesta de `/api/paddle/products`
- Screenshot de la página `/pricing`

