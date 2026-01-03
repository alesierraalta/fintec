# Actualización de Variables de Entorno - FinTec

## Resumen de Cambios

Se han actualizado los archivos de configuración de variables de entorno para eliminar referencias a LemonSqueezy y otros proveedores de pago obsoletos.

## Archivos Creados

### 1. `.env.local.example`
Archivo de ejemplo con descripciones detalladas de cada variable:
- **Supabase Configuration**: URL, anon key, y service role key
- **Admin Configuration**: Lista de UUIDs de administradores
- **WebSocket Configuration**: URL para actualizaciones en tiempo real (opcional)

### 2. `.env.example`
Archivo genérico con valores vacíos para todas las variables requeridas.

## Archivos Modificados

### 1. `README.md`
- ✅ Actualizada la sección de Variables de Entorno
- ✅ Agregadas instrucciones para copiar `.env.local.example`
- ✅ Incluidas instrucciones detalladas para obtener credenciales de Supabase
- ✅ Documentación mejorada sobre la configuración de administradores
- ✅ Eliminadas referencias a proveedores de pago obsoletos

### 2. `jest.setup.js`
- ✅ Eliminada referencia a LemonSqueezy en comentario del mock de fetch

## Variables de Entorno Documentadas

### Requeridas para Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=          # URL de tu proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Clave pública/anon de Supabase
SUPABASE_SERVICE_ROLE_KEY=         # Clave de servicio (¡mantener secreta!)
```

### Configuración de Administradores
```env
ADMIN_USER_IDS=                    # UUIDs separados por comas
```

### Opcional
```env
NEXT_PUBLIC_WEBSOCKET_URL=         # URL del servidor WebSocket (default: http://localhost:3001)
```

## Cómo Usar

1. **Copiar el archivo de ejemplo:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Obtener credenciales de Supabase:**
   - Ir a [Supabase](https://app.supabase.com)
   - Crear un proyecto nuevo o seleccionar uno existente
   - Navegar a **Settings** → **API**
   - Copiar **URL** y **anon/public key**
   - Copiar **service_role_key** (mantener segura)

3. **Configurar administradores:**
   - Obtener los UUIDs de los usuarios que serán administradores
   - Agregarlos separados por comas en `ADMIN_USER_IDS`

4. **Configurar WebSocket (opcional):**
   - Si usas actualizaciones en tiempo real de tasas de cambio
   - Configurar la URL del servidor WebSocket

## Notas Importantes

- ⚠️ **Nunca** commitear el archivo `.env.local` al repositorio
- ⚠️ El archivo `.env.local` ya está incluido en `.gitignore`
- ⚠️ El `SUPABASE_SERVICE_ROLE_KEY` tiene permisos completos - mantenerlo seguro
- ℹ️ Las variables con prefijo `NEXT_PUBLIC_` son accesibles en el cliente
- ℹ️ Las variables sin prefijo solo están disponibles en el servidor

## Referencias Eliminadas

- ❌ LemonSqueezy (proveedor de pagos)
- ❌ Referencias obsoletas a otros proveedores de pago

## Archivos con Referencias a Paddle (No Modificados)

Los siguientes archivos aún contienen referencias a Paddle en términos y políticas:
- `app/terms/page.tsx`
- `app/privacy/page.tsx`
- `components/subscription/pricing-cards.tsx`

**Nota:** Si deseas eliminar completamente las funcionalidades de suscripción/pago, estos archivos también deberían actualizarse.

## Próximos Pasos Sugeridos

1. Crear tu archivo `.env.local` usando el ejemplo
2. Configurar un proyecto en Supabase
3. Agregar las credenciales al archivo `.env.local`
4. Configurar los UUIDs de administradores
5. (Opcional) Actualizar páginas de términos y privacidad si no usarás Paddle

---

**Fecha de actualización:** 2026-01-02
**Versión:** 1.0
