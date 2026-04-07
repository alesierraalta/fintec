# Proposal: Fix Mobile Layout Regressions

## Intent

Restaurar la estética minimalista y compacta del header y eliminar el desplazamiento horizontal "terrible" de la barra de navegación inferior, manteniendo la protección contra filtraciones de fondo en el notch.

## Scope

- **Header**: Corregir el cálculo de la altura para eliminar el espacio excesivo.
- **MobileNav**: Asegurar que los 6 items quepan en pantallas de 375px (iPhone) sin necesidad de scroll.

## Implementation Plan

### 1. Header (Simplificación)

- Eliminar el `div` espaciador redundante.
- Aplicar `padding-top: env(safe-area-inset-top)` directamente al elemento `header`.
- Esto garantiza que el fondo `black-theme-header` cubra el área del safe area sin duplicar el espacio.

### 2. Mobile Navigation (Distribución Fluida)

- Eliminar `overflow-x-auto`, `snap-x` y `snap-mandatory` del contenedor.
- Eliminar `min-w-[4.25rem]` y `flex-shrink-0` de los items.
- Usar `flex-1` y `justify-around` para que el navegador distribuya los items equitativamente según el ancho de pantalla disponible.
- Reducir el `gap-1` a `gap-0.5` para maximizar espacio en pantallas muy pequeñas.

## Verification Plan

1. Inspeccionar en 375px: Verificar que el header es compacto y la barra inferior no tiene scroll horizontal.
2. Inspeccionar en 320px: Verificar que los 6 items de la barra inferior son legibles y no se amontonan ilegiblemente.
3. Verificar scroll vertical: Asegurar que el fondo del header sigue cubriendo el safe area al subir/bajar.
