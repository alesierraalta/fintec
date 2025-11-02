# 🔐 Configuración de API Keys - Asistente IA Premium

Este documento explica las API keys necesarias para la nueva implementación del Asistente IA con resiliencia, escalabilidad y seguridad.

---

## 📋 Variables de Entorno Requeridas

### 🔑 **1. OpenAI API Key** (Obligatoria)

**Variable:** `OPENAI_API_KEY`

**Descripción:** Clave de API de OpenAI para acceder a los modelos GPT-5 nano/mini (con fallback a GPT-4o-mini).

**Cómo obtenerla:**
1. Ve a [OpenAI Platform](https://platform.openai.com/)
2. Inicia sesión o crea una cuenta
3. Ve a **API Keys** → **Create new secret key**
4. Copia la clave (formato: `sk-...`)

**Valor de ejemplo:**
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Uso:** El sistema usa esta clave para generar respuestas del asistente IA. Sin esta clave, el asistente no funcionará.

---

### 🗄️ **2. Redis URL** (Opcional pero Recomendado)

**Variable:** `REDIS_URL`

**Descripción:** URL de conexión a Redis para caché, rate limiting y metadatos. Soporta Upstash (serverless) o Redis estándar.

**Opciones:**

#### **Opción A: Upstash Redis (Recomendado para Vercel/Serverless)**

1. Ve a [Upstash](https://upstash.com/)
2. Crea una cuenta gratuita
3. Crea un nuevo **Redis Database**
4. Selecciona región cercana a tu aplicación
5. Copia la **REST URL** o **Redis URL**

**Valor de ejemplo (Upstash):**
```env
REDIS_URL=rediss://default:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@xxxx-xxxx.upstash.io:6379
```

**Nota:** Si usas TLS (recomendado), la URL debe empezar con `rediss://` (doble 's').

#### **Opción B: Redis Estándar (Self-hosted o Cloud Provider)**

Si tienes un servidor Redis propio:

```env
REDIS_URL=redis://username:password@host:port
```

**Fallback:** Si no se configura `REDIS_URL`, el sistema usa un caché in-memory (solo funciona dentro de una instancia, no compartido entre servidores).

---

### 🌐 **3. App URL** (Opcional pero Recomendado)

**Variable:** `NEXT_PUBLIC_APP_URL`

**Descripción:** URL de la aplicación para validación CORS.

**Valor de ejemplo (Producción):**
```env
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

**Valor de ejemplo (Desarrollo local):**
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Uso:** Se usa para validar requests CORS. Si no se configura, se permiten `localhost:3000` y `localhost:5173` por defecto.

---

## 🚀 Configuración en Vercel

### **Paso 1: Ir a Configuración del Proyecto**

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto **FINTEC**
3. Ve a **Settings** → **Environment Variables**

### **Paso 2: Agregar Variables de Entorno**

Agrega las siguientes variables:

#### **Producción (Production):**

| Variable | Valor | Tipo |
|----------|-------|------|
| `OPENAI_API_KEY` | `sk-proj-...` (tu clave OpenAI) | Secret |
| `REDIS_URL` | `rediss://default:...@xxx.upstash.io:6379` | Secret |
| `NEXT_PUBLIC_APP_URL` | `https://tu-app.vercel.app` | Plain Text |

#### **Preview (Opcional - para branches):**

| Variable | Valor | Tipo |
|----------|-------|------|
| `OPENAI_API_KEY` | `sk-proj-...` (mismo que producción) | Secret |
| `REDIS_URL` | `rediss://...` (puede ser diferente para staging) | Secret |
| `NEXT_PUBLIC_APP_URL` | `https://tu-app-preview.vercel.app` | Plain Text |

#### **Development (Local):**

Las variables de desarrollo se configuran en `.env.local` (no se suben a Git):

```env
# .env.local (crear en la raíz del proyecto)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REDIS_URL=rediss://default:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@xxxx-xxxx.upstash.io:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### **Paso 3: Redeploy después de Agregar Variables**

Después de agregar las variables en Vercel:

1. Ve a **Deployments**
2. Selecciona el último deployment
3. Click en **"..."** (tres puntos) → **Redeploy**
4. Asegúrate de marcar **"Use existing Build Cache"** como `false` para que las nuevas variables se carguen

O simplemente haz un nuevo push:

```bash
git commit --allow-empty -m "trigger redeploy with new env vars"
git push
```

---

## 🔍 Verificación de Configuración

### **1. Verificar que las Variables Están Cargadas**

En Vercel, puedes verificar que las variables están configuradas:
- Ve a **Settings** → **Environment Variables**
- Debe mostrar las 3 variables listadas arriba

### **2. Probar el Endpoint de AI Chat**

Después del deploy, prueba el endpoint:

```bash
curl -X POST https://tu-app.vercel.app/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "messages": [{"role": "user", "content": "Hola"}]
  }'
```

**Nota:** Este endpoint requiere autenticación premium, así que en producción necesitarás estar autenticado.

### **3. Verificar Logs en Vercel**

1. Ve a **Deployments** → Selecciona el deployment más reciente
2. Click en **"Functions"** → Selecciona `/api/ai/chat`
3. Revisa los logs para errores relacionados con:
   - `OPENAI_API_KEY` no encontrada
   - `REDIS_URL` no encontrada o conexión fallida
   - Timeouts o errores de rate limiting

---

## ⚠️ Troubleshooting

### **Error: "OPENAI_API_KEY not configured"**

**Solución:**
1. Verifica que agregaste la variable en Vercel
2. Verifica que el nombre es exactamente `OPENAI_API_KEY` (sin espacios)
3. Redeploy el proyecto
4. Verifica que la variable está marcada para el entorno correcto (Production/Preview/Development)

### **Error: "Redis connection failed"**

**Solución:**
1. Verifica que `REDIS_URL` está configurada correctamente
2. Si usas Upstash, verifica que la URL incluye `rediss://` (TLS) o `redis://` (sin TLS)
3. Verifica que la base de datos Redis está activa en Upstash
4. El sistema tiene fallback a in-memory, así que esto no debería romper la app, pero el rate limiting y caché no serán compartidos entre instancias

### **Error: "CORS policy violation"**

**Solución:**
1. Verifica que `NEXT_PUBLIC_APP_URL` está configurada correctamente
2. Asegúrate que la URL en el navegador coincide con la configurada
3. Revisa que el origin del request está en la lista de permitidos

### **Rate Limit: "429 Too Many Requests"**

**Causa:** Esto es normal si el usuario excede 10 requests/minuto.

**Solución:**
- Espera 1 minuto antes de hacer otro request
- El header `Retry-After` indica cuántos segundos esperar

---

## 📊 Costos Estimados

### **OpenAI API**
- **GPT-4o-mini** (fallback): ~$0.150 / 1M input tokens, ~$0.600 / 1M output tokens
- **GPT-5 nano/mini**: Precio por confirmar cuando estén disponibles
- **Estimación:** ~$0.001-0.01 por conversación típica (depende de longitud)

### **Upstash Redis (Free Tier)**
- **Gratis:** Hasta 10,000 comandos/día
- **Paid:** $0.20 por 100K comandos adicionales
- **Estimación:** Con rate limiting y caché, ~5-10 comandos por request de IA

---

## 🔒 Seguridad

### **Importante:**
- ✅ **NUNCA** subas las API keys a Git
- ✅ Usa **Secrets** en Vercel (no Plain Text para keys sensibles)
- ✅ **ROTA** las keys periódicamente (cada 3-6 meses)
- ✅ **REVISA** los logs regularmente para detectar uso anormal
- ✅ **LIMITA** el acceso a las keys solo a quienes las necesitan

### **Validación Automática:**
El sistema valida automáticamente:
- ✅ API Key obligatoria (sin ella, el endpoint retorna 500)
- ✅ Rate limiting (10 req/min por usuario)
- ✅ Payload size limit (100KB máximo)
- ✅ CORS configurable
- ✅ Logs sanitizados (sin datos sensibles)

---

## 📚 Referencias

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

## ✅ Checklist de Configuración

- [ ] OpenAI API Key creada y configurada en Vercel
- [ ] Redis URL configurada (Upstash o propia)
- [ ] `NEXT_PUBLIC_APP_URL` configurada con la URL correcta
- [ ] Variables configuradas para Production, Preview y Development
- [ ] Redeploy ejecutado después de agregar variables
- [ ] Endpoint `/api/ai/chat` probado y funcionando
- [ ] Logs verificados sin errores de configuración

---

---

## 👤 Configurar Usuario Premium en Supabase

Para hacer premium a un usuario específico (por ejemplo, para testing o administración):

### **Opción 1: Ejecutar Script SQL en Supabase Dashboard**

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** → **New Query**
4. Copia y pega el contenido de `scripts/make-user-premium.sql`
5. Modifica el email en el script si necesitas otro usuario:
   ```sql
   WHERE email = 'tu-email@ejemplo.com'
   ```
6. Ejecuta el query (click en **Run** o `Ctrl+Enter`)
7. Verifica que el usuario ahora tiene `subscription_tier = 'premium'`

### **Opción 2: Usar Supabase MCP (desde Cursor)**

Si tienes Supabase MCP configurado, puedes ejecutar:

```sql
-- Reemplaza 'tu-email@ejemplo.com' con el email del usuario
DO $$
DECLARE
  target_user_id UUID;
  existing_subscription_id UUID;
BEGIN
  -- Obtener user_id
  SELECT id INTO target_user_id
  FROM users
  WHERE email = 'tu-email@ejemplo.com'
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Actualizar users
  UPDATE users
  SET 
    subscription_tier = 'premium',
    subscription_status = 'active',
    subscription_started_at = COALESCE(subscription_started_at, NOW()),
    subscription_expires_at = NOW() + INTERVAL '100 years'
  WHERE id = target_user_id;

  -- Actualizar o crear subscription
  SELECT id INTO existing_subscription_id
  FROM subscriptions
  WHERE user_id = target_user_id
  LIMIT 1;

  IF existing_subscription_id IS NOT NULL THEN
    UPDATE subscriptions
    SET tier = 'premium', status = 'active', updated_at = NOW()
    WHERE id = existing_subscription_id;
  ELSE
    INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end)
    VALUES (target_user_id, 'premium', 'active', NOW(), NOW() + INTERVAL '100 years');
  END IF;
END $$;
```

### **Verificar Cambios**

Ejecuta este query para verificar:

```sql
SELECT 
  u.email,
  u.subscription_tier,
  u.subscription_status,
  s.tier as subscription_tier,
  s.status as subscription_status
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.email = 'tu-email@ejemplo.com';
```

Deberías ver:
- `subscription_tier` = `'premium'`
- `subscription_status` = `'active'`

---

**Última actualización:** Enero 2025


