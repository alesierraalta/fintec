# 🚀 Setup Fintec - Configuración Completa

**Dominio Producción**: https://fintec-six.vercel.app  
**Usuario LemonSqueezy**: alejandro sierraalta (alesierraalta@gmail.com)  
**Modo Actual**: TEST ✅

---

## ✅ CONFIGURACIÓN AUTOMÁTICA COMPLETADA (80%)

### Supabase
- ✅ Store: Fintec (ID: 229057)
- ✅ Webhook creado (ID: 56213)
- ✅ Base de datos migrada (11 tablas)
- ✅ RLS habilitado

### LemonSqueezy  
- ✅ Cuenta verificada
- ✅ Store configurado
- ✅ Webhook configurado automáticamente

---

## ⏳ PASOS SIGUIENTES (5 minutos)

### 1. Obtener Service Role Key de Supabase (1 min)
```
https://supabase.com/dashboard
→ Proyecto: fintec
→ Settings → API
→ Copiar "service_role" key (secret)
```

### 2. Crear API Key en LemonSqueezy (1 min)
```
https://app.lemonsqueezy.com/settings/api
→ Create API Key
→ Name: Fintec Production
→ Scopes: Todos
→ Copiar la key
```

### 3. Crear Productos en LemonSqueezy (2 min)
```
https://app.lemonsqueezy.com/products

Producto 1: Base - Plan Fintec
  Price: $4.99 USD
  Billing: Monthly
  Type: Subscription
  → Copiar Variant ID

Producto 2: Premium - Plan Fintec
  Price: $9.99 USD
  Billing: Monthly
  Type: Subscription
  → Copiar Variant ID
```

---

## 🌍 VARIABLES DE ENTORNO

### 📦 PARA VERCEL (PRODUCCIÓN)

Vercel Dashboard → fintec-six → Settings → Environment Variables

```env
# ========================================
# SUPABASE - PRODUCCIÓN
# ========================================

NEXT_PUBLIC_SUPABASE_URL
https://bfxkcmoccqgvkrrkkdju.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeGtjbW9jY3FndmtycmtrZGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MzAwODMsImV4cCI6MjA3NTUwNjA4M30.C8a8aC5gGAUGtbPbZ1uQUHBewtTi43cWNRS_StqjvAM

SUPABASE_SERVICE_ROLE_KEY
[OBTENER DEL PASO 1]

# ========================================
# LEMONSQUEEZY - PRODUCCIÓN
# ========================================

LEMONSQUEEZY_API_KEY
[OBTENER DEL PASO 2]

LEMONSQUEEZY_STORE_ID
229057

LEMONSQUEEZY_VARIANT_ID_BASE
[OBTENER DEL PASO 3 - Producto Base]

LEMONSQUEEZY_VARIANT_ID_PREMIUM
[OBTENER DEL PASO 3 - Producto Premium]

LEMONSQUEEZY_WEBHOOK_SECRET
ff85755c034e89ea5f877662a24834e3

# ========================================
# APP CONFIGURATION
# ========================================

NEXT_PUBLIC_APP_URL
https://fintec-six.vercel.app

NODE_ENV
production
```

---

### 💻 PARA DESARROLLO LOCAL (.env.local)

Crear archivo `.env.local` en la raíz del proyecto:

```env
# ========================================
# SUPABASE - DESARROLLO (mismo que producción)
# ========================================

NEXT_PUBLIC_SUPABASE_URL=https://bfxkcmoccqgvkrrkkdju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeGtjbW9jY3FndmtycmtrZGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MzAwODMsImV4cCI6MjA3NTUwNjA4M30.C8a8aC5gGAUGtbPbZ1uQUHBewtTi43cWNRS_StqjvAM
SUPABASE_SERVICE_ROLE_KEY=[MISMO DEL PASO 1]

# ========================================
# LEMONSQUEEZY - TEST MODE
# ========================================

LEMONSQUEEZY_API_KEY=[MISMO DEL PASO 2]
LEMONSQUEEZY_STORE_ID=229057
LEMONSQUEEZY_VARIANT_ID_BASE=[MISMO DEL PASO 3]
LEMONSQUEEZY_VARIANT_ID_PREMIUM=[MISMO DEL PASO 3]
LEMONSQUEEZY_WEBHOOK_SECRET=ff85755c034e89ea5f877662a24834e3

# ========================================
# APP CONFIGURATION - LOCAL
# ========================================

NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 🚀 DEPLOY Y TESTING

### Para Producción (Vercel)
```bash
# Después de agregar variables a Vercel:
# 1. Vercel Dashboard → Deployments → Redeploy

# O desde terminal:
git add .
git commit -m "feat: configured LemonSqueezy"
git push origin main
```

### Para Desarrollo Local
```bash
# 1. Crear .env.local con las variables de arriba
# 2. Instalar dependencias si falta algo
npm install

# 3. Iniciar servidor
npm run dev

# 4. Abrir navegador
# http://localhost:3000
```

---

## 🧪 PROBAR CHECKOUT

### En Producción:
```
1. https://fintec-six.vercel.app/pricing
2. Click "Subscribe" en cualquier plan
3. Tarjeta de test: 4242 4242 4242 4242
4. Completar checkout
5. Verificar redirección a /subscription/success
```

### En Local:
```
1. http://localhost:3000/pricing
2. Click "Subscribe"
3. Tarjeta de test: 4242 4242 4242 4242
4. Verificar que funciona igual
```

**Tarjetas de Prueba** (LemonSqueezy test mode):
```
Éxito: 4242 4242 4242 4242
Expiry: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

---

## 📊 ESTADO ACTUAL

| Componente | Producción | Local |
|------------|-----------|-------|
| Supabase | ✅ 95% | ✅ 95% |
| LemonSqueezy Store | ✅ 100% | ✅ 100% |
| LemonSqueezy Webhook | ✅ 100% | ✅ 100% |
| API Key | ⏳ Falta | ⏳ Falta |
| Productos | ⏳ Faltan | ⏳ Faltan |
| Variables Entorno | ⏳ Faltan | ⏳ Faltan |

**Progreso**: 🟢 **80% completo** - Solo 5 minutos más

---

## 🎯 CHECKLIST

### Configuración:
- [x] Cuenta LemonSqueezy verificada
- [x] Store creado (ID: 229057)
- [x] Webhook configurado (ID: 56213)
- [x] Base de datos Supabase migrada
- [ ] API Key de LemonSqueezy creada
- [ ] Productos Base y Premium creados
- [ ] Service Role Key de Supabase obtenida

### Deployment:
- [ ] Variables agregadas a Vercel
- [ ] Variables agregadas a .env.local
- [ ] Deploy ejecutado
- [ ] Checkout probado en producción
- [ ] Checkout probado en local

---

## 📞 URLS IMPORTANTES

**Dashboards**:
- Supabase: https://supabase.com/dashboard
- LemonSqueezy: https://app.lemonsqueezy.com
- Vercel: https://vercel.com/dashboard

**Tu App**:
- Producción: https://fintec-six.vercel.app
- Local: http://localhost:3000

**Webhook Configurado**:
- URL: https://fintec-six.vercel.app/api/lemonsqueezy/webhook
- Secret: ff85755c034e89ea5f877662a24834e3

---

## 💡 NOTAS

### Test Mode vs Live Mode

**Ahora (TEST)**: 
- ✅ No necesitas cuenta bancaria
- ✅ No se cobran tarjetas reales
- ✅ Puedes probar TODO gratis

**Para Producción (LIVE)**:
- Cambiar a Live Mode en LemonSqueezy
- Crear los mismos productos en Live
- Verificar identidad
- Agregar información de pago (donde te envían el dinero)
- Actualizar keys a Live mode

### Mismas Keys para Local y Producción

**Sí**, puedes usar las mismas keys de LemonSqueezy en:
- ✅ Desarrollo local
- ✅ Vercel producción

**Diferencia**: Solo la URL (`NEXT_PUBLIC_APP_URL`)
- Local: `http://localhost:3000`
- Producción: `https://fintec-six.vercel.app`

---

## 🚀 QUICK START

```bash
# 1. Abre el archivo principal
code docs/SETUP_FINTEC.md

# 2. Sigue los 3 pasos (5 min)

# 3. Copia variables a Vercel y .env.local

# 4. Deploy
git add .
git commit -m "feat: LemonSqueezy configured"
git push origin main

# 5. Prueba local
npm run dev
open http://localhost:3000/pricing

# 6. Prueba producción
open https://fintec-six.vercel.app/pricing
```

---

**Progreso**: 80% ✅  
**Tiempo restante**: 5 minutos  
**Archivo principal**: `docs/SETUP_FINTEC.md` ⭐
