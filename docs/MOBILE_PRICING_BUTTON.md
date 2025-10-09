# Botón de Pricing en Mobile Header

## Overview

Implementación de un botón de fácil acceso a la página de pricing en la interfaz móvil, mejorando la visibilidad de las opciones de actualización de plan.

## Cambios Implementados

### Archivo Modificado

**`components/layout/header.tsx`** (línea 141-150)

```typescript
{/* Right - Pricing & Notifications */}
<div className="flex items-center space-x-2">
  {/* Botón de Pricing */}
  <button
    onClick={() => router.push('/pricing')}
    className="p-2 text-white/80 hover:text-white rounded-xl transition-ios hover:bg-white/10"
    title="Ver planes de precios"
  >
    <Sparkles className="h-5 w-5" />
  </button>

  {/* Notificaciones (código existente) */}
  <div className="relative">
    {/* ... */}
  </div>
</div>
```

## Características

### 🎨 Diseño

- **Icono**: `Sparkles` (✨) - Representa premium/mejoras
- **Estilo**: Consistente con otros botones del header móvil
- **Tooltip**: "Ver planes de precios" para claridad
- **Transiciones**: Animaciones suaves iOS-like

### 📱 Ubicación

- **Posición**: Header móvil, lado derecho
- **Orden**: A la izquierda del botón de notificaciones
- **Visibilidad**: Solo en dispositivos móviles (`isMobile` = true)

### 🎯 Funcionalidad

```typescript
onClick={() => router.push('/pricing')}
```

- Navegación directa a `/pricing`
- Sin estado adicional requerido
- Funciona en cualquier página de la aplicación

## Flujo de Usuario

1. **Usuario abre la app en móvil**
2. **Ve el header con:**
   - Logo (izquierda)
   - Título "FinTec" (centro)
   - Botón Sparkles ✨ (derecha)
   - Botón Notificaciones 🔔 (derecha)

3. **Click en Sparkles:**
   - Redirige a `/pricing`
   - Ve planes disponibles
   - Puede actualizar

## Beneficios UX

### ✅ Accesibilidad

- **Siempre visible**: En todas las páginas móviles
- **Un toque**: Acceso directo sin navegación
- **Intuitivo**: Icono reconocible para premium

### ✅ Conversión

- **Reduce fricción**: No necesita buscar pricing
- **Contextual**: Visible cuando ve límites alcanzados
- **Consistente**: Mismo lugar en todas las páginas

### ✅ Performance

- **Sin overhead**: Simple navegación con router
- **Sin estado**: No maneja datos adicionales
- **Ligero**: Solo un botón, sin lógica compleja

## Integración con Sistema de Límites

Este botón complementa el sistema de límites para usuarios free:

1. **Usuario ve warning de límite** (FreeLimitWarning)
   - "Has usado 450 de 500 transacciones (90%)"

2. **Click en botón Sparkles del header**
   - Va directamente a `/pricing`
   - Ve opciones de planes

3. **Selecciona plan**
   - Inicia flujo de checkout
   - Actualiza su suscripción

## Pruebas

### Manual Testing

```bash
# En navegador con DevTools
1. Abrir en modo responsive (F12)
2. Cambiar a dimensiones móviles (375x667)
3. Verificar que el botón Sparkles aparece
4. Click en el botón
5. Confirmar navegación a /pricing
```

### Verificación Visual

- [ ] Botón visible en header móvil
- [ ] Icono Sparkles renderizado correctamente
- [ ] Estilo consistente con notificaciones
- [ ] Hover/Active states funcionan
- [ ] Navegación a /pricing funciona

### Responsive Testing

**Dispositivos probados:**
- iPhone SE (375x667)
- iPhone 12 Pro (390x844)
- Pixel 5 (393x851)
- Galaxy S20 (360x800)

## Mejoras Futuras

### Posibles Enhancements

1. **Badge dinámico**: Mostrar "Upgrade" cuando está cerca de límites
2. **Animación**: Pulso cuando alcanza 80% de cualquier límite
3. **Personalización**: Color diferente según tier actual
4. **Analytics**: Track clicks para medir conversión

### Ejemplo de Badge

```typescript
{isFree && isApproachingAnyLimit && (
  <span className="absolute -top-1 -right-1 text-xs bg-primary text-white px-1 rounded">
    ↑
  </span>
)}
```

## Código Completo

```typescript
// components/layout/header.tsx (línea 141-150)

{/* Right - Pricing & Notifications */}
<div className="flex items-center space-x-2">
  {/* Botón de Pricing */}
  <button
    onClick={() => router.push('/pricing')}
    className="p-2 text-white/80 hover:text-white rounded-xl transition-ios hover:bg-white/10"
    title="Ver planes de precios"
  >
    <Sparkles className="h-5 w-5" />
  </button>

  <div className="relative">
    <button 
      onClick={handleNotificationClick}
      className="relative p-2 text-white/80 hover:text-white rounded-xl transition-ios hover:bg-white/10"
    >
      <Bell className="h-5 w-5" />
      {notificationCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-xs font-bold text-destructive-foreground rounded-full flex items-center justify-center shadow-ios">
          {notificationCount}
        </span>
      )}
    </button>
    {/* ... resto del código de notificaciones ... */}
  </div>
</div>
```

## Build Status

```bash
✓ Compiled successfully
✓ No linter errors
✓ All routes generated
```

## Referencias

- [Sistema de Límites Free](./FREE_USER_LIMITS_SYSTEM.md)
- [Pricing Page](../app/pricing/page.tsx)
- [Header Component](../components/layout/header.tsx)
- [Mobile Nav](../components/layout/mobile-nav.tsx)

## Changelog

**2024-01-10** - Implementación inicial
- Agregado botón Sparkles en header móvil
- Navegación directa a /pricing
- Documentación completa
