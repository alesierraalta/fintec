# Instrucciones: Habilitar Protección de Contraseñas Filtradas

## Resumen
Este documento contiene las instrucciones para habilitar la protección contra contraseñas filtradas en Supabase Auth. Esta característica previene que los usuarios usen contraseñas que han sido comprometidas en brechas de datos anteriores, consultando la base de datos de HaveIBeenPwned.org.

## Requisitos
- Proyecto en plan **Pro** o superior
- Acceso al Dashboard de Supabase

## Pasos para Habilitar

1. **Acceder al Dashboard de Supabase**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Navegar a Authentication Settings**
   - En el menú lateral, ve a **Authentication** → **Providers**
   - O directamente a: https://supabase.com/dashboard/project/_/auth/providers

3. **Configurar Email Provider**
   - Busca la sección **Email** en la lista de providers
   - Haz clic en el provider de Email para abrir sus configuraciones

4. **Habilitar Password Security**
   - En la sección **Password Security**, busca la opción **"Prevent leaked passwords"**
   - Activa el toggle para habilitar esta característica
   - Guarda los cambios

## Verificación

Después de habilitar, puedes verificar que la advertencia desapareció ejecutando:

```sql
-- Verificar advertencias de seguridad
-- Debe retornar 0 advertencias de auth_leaked_password_protection
```

O usando el Supabase Advisor:
- Dashboard → **Database** → **Advisors** → **Security**
- La advertencia "Leaked Password Protection Disabled" debe desaparecer

## Referencias
- [Supabase: Password Security Documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [HaveIBeenPwned API](https://haveibeenpwned.com/Passwords)

## Notas
- Esta característica está disponible solo en planes Pro y superiores
- La verificación usa la API pública de HaveIBeenPwned.org de forma segura (solo envía hash del password, no el password completo)
- Los usuarios existentes pueden seguir usando sus contraseñas actuales, pero se les advertirá si su contraseña es débil al iniciar sesión

