# 🚀 Configuración de Transacciones Recurrentes en Supabase

## 📋 Resumen

He implementado una solución completa de **transacciones recurrentes** que se integra directamente con tu base de datos Supabase. Aunque no existe un MCP oficial de Supabase, he creado un script personalizado que actúa como interfaz para ejecutar los cambios necesarios.

## 🔧 Configuración Requerida

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url_aquí
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aquí
```

**¿Dónde encontrar estas variables?**
- Ve a tu dashboard de Supabase
- Selecciona tu proyecto
- Ve a `Settings` → `API`
- Copia la `URL` y el `service_role` key (NO el anon key)

### 2. Instalación de Dependencias

```bash
npm install @supabase/supabase-js dotenv
```

## 🎯 Ejecución de Cambios

### Opción 1: Script Automático (Recomendado)

```bash
node scripts/apply-recurring-transactions.js
```

Este script:
- ✅ Crea la tabla `recurring_transactions`
- ✅ Configura índices para performance
- ✅ Establece Row Level Security (RLS)
- ✅ Crea funciones SQL auxiliares
- ✅ Programa el job de pg_cron

### Opción 2: Manual en Supabase Dashboard

Si el script automático no funciona:

1. Ve a tu Supabase Dashboard
2. Navega a `SQL Editor`
3. Copia y pega el contenido de `scripts/create-recurring-transactions.sql`
4. Ejecuta el SQL

## 🌟 Funcionalidades Implementadas

### 📊 Base de Datos
- **Tabla**: `recurring_transactions` con todos los campos necesarios
- **Automatización**: Job de pg_cron que ejecuta diariamente a las 6 AM
- **Seguridad**: RLS configurado para aislamiento por usuario
- **Performance**: Índices optimizados

### 💻 Frontend
- **Formularios**: Integración en formularios mobile y desktop
- **Gestión**: Página `/recurring` para administrar transacciones recurrentes
- **UX**: Interfaz intuitiva para crear, pausar y eliminar recurrencias

### 🔄 Automatización
- **Frecuencias**: Diaria, semanal, mensual, anual
- **Flexibilidad**: Intervalos personalizables (cada N días/semanas/meses)
- **Control**: Fecha de inicio y fin opcional
- **Estado**: Activar/pausar recurrencias

## 📈 Cómo Usar

### Para Usuarios Finales:

1. **Crear Transacción Recurrente**:
   - Ve a `/transactions/add`
   - Llena el formulario normalmente
   - Activa "🔄 Transacción Recurrente"
   - Selecciona frecuencia y configuraciones
   - Guarda

2. **Gestionar Recurrencias**:
   - Ve a `/recurring`
   - Ve todas tus transacciones automáticas
   - Pausa, activa o elimina según necesites

### Para Desarrolladores:

```typescript
// Crear transacción recurrente
const recurringData = {
  name: "Salario Mensual",
  type: "INCOME",
  accountId: "account-id",
  categoryId: "salary-category-id",
  currencyCode: "USD",
  amountMinor: 300000, // $3000.00
  frequency: "monthly",
  startDate: "2024-01-01"
};

await repository.recurringTransactions.create(recurringData, userId);
```

## 🎉 Resultado Final

Los usuarios ahora pueden:
- ✅ Crear transacciones que se ejecuten automáticamente
- ✅ Configurar diferentes frecuencias (diaria, semanal, mensual, anual)
- ✅ Gestionar sus recurrencias desde una interfaz dedicada
- ✅ Pausar o reactivar transacciones automáticas
- ✅ Ver cuándo se ejecutará la próxima transacción

## 🔍 Verificación

Para verificar que todo funciona:

1. **Base de Datos**: Revisa que la tabla `recurring_transactions` existe
2. **Job de Cron**: Ve a Supabase Dashboard → Database → Cron Jobs
3. **Frontend**: Visita `/transactions/add` y `/recurring`
4. **Funcionalidad**: Crea una transacción recurrente de prueba

## 🆘 Solución de Problemas

### Error: Variables de entorno no encontradas
- Verifica que `.env.local` existe y tiene las variables correctas
- Asegúrate de usar el `service_role` key, no el `anon` key

### Error: No se puede ejecutar SQL
- Verifica permisos del service role key
- Intenta la ejecución manual en Supabase Dashboard

### Error: Tabla ya existe
- El script es seguro para re-ejecutar
- Usa `IF NOT EXISTS` en las declaraciones SQL

## 🎯 Próximos Pasos

1. **Configura las variables de entorno**
2. **Ejecuta el script de configuración**
3. **Prueba la funcionalidad**
4. **¡Disfruta de las transacciones automáticas!**

---

*Este sistema reemplaza la necesidad de un MCP específico de Supabase, proporcionando la misma funcionalidad de forma directa y eficiente.*



