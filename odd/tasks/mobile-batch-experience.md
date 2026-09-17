# ODD Task: Rediseño y Optimización Mobile de Agregar Transacción y Carga en Lote

## 1. Intent & Scope

- **Objetivo**: Rediseñar y corregir integralmente la experiencia de usuario de "Agregar transacción" y "Agregar en lote" con foco absoluto en mobile (375px y 430px) manteniendo excelente usabilidad en tablet (768px) y desktop (1440px).
- **Enfoque**: Organic Driven Development (ODD) guiado por observación visual y pruebas interactivas con Playwright antes y después de los cambios.
- **Alcance**:
  1. `AddTransactionMenu`: Eliminar el drag handle decorativo sin interacción y optimizar touch targets.
  2. `BatchReceiptUploaderModal`:
     - Rediseñar zona de carga en mobile (acciones directas: Cámara `[Tomar foto]` y Galería `[Elegir fotos]`, eliminando el foco en drag & drop para pantallas pequeñas).
     - Rediseñar las cards de comprobantes para mobile: compactas, legibles, con resumen limpio (`Monto`, `Comercio`, `Fecha`, badge de estado) y modo de edición enfocado en vez de saturar de inputs simultáneos.
     - Garantizar touch targets >= 44-48px para todos los botones, iconos e inputs.
     - Jerarquía visual de acciones: botón primario claro en barra inferior (`[Confirmar N transacciones]`), acciones secundarias subordinadas.
     - Evitar capas/modals anidados innecesarios.
     - Form inputs con `text-base` (16px) para evitar zoom en iOS y scroll fluido con teclado abierto.
     - Resiliencia con lotes grandes (1, 3, 10, 20 comprobantes) y estados de error/duplicado.

## 2. Checklist

- [x] **Fase 1: Diagnóstico Visual con Playwright (Baseline Screenshots)**
  - [x] Levantar entorno o script de Playwright con mocks de escaneo.
  - [x] Capturar screenshots en 375px, 430px, 768px y 1440px:
    - `01-add-menu-mobile.png`
    - `02-batch-upload-mobile.png`
    - `03-batch-processing-mobile.png`
    - `04-batch-review-mobile.png`
    - `05-batch-missing-fields-mobile.png`
  - [x] Analizar visualmente problemas de layout, proporciones y touch targets (16 violaciones identificadas <40px).
- [x] **Fase 2: Corrección de AddTransactionMenu**
  - [x] Eliminar drag handle estático y engañoso en `components/transactions/add-transaction-menu.tsx`.
  - [x] Optimizar spacing y touch targets (>= 48px) de los botones del menú en mobile.
- [x] **Fase 3: Rediseño de BatchReceiptUploaderModal para Mobile**
  - [x] Zona de carga adaptativa:
    - Mobile: Botones táctiles prominentes (h-12) para Galería `[Elegir fotos]` y Cámara directa `[Tomar foto]` con `capture="environment"`.
    - Desktop: Mantener dropzone amplia y selector de archivos.
  - [x] Cards compactas para mobile:
    - Vista resumen colapsada: Comercio, monto destacado con badge Gasto/Ingreso, fecha, cuenta, badge de estado y acción `[Editar campos]`.
    - Vista expandida / inline rápida en accordion: Inputs cómodos de 44px (text-base para evitar auto-zoom en iOS), selector Gasto/Ingreso de 44px y botón "Hoy" de 44px.
    - Badges claros y jerárquicos (`Ready`, `Missing information`, `Needs review`, `Error`).
  - [x] Barra inferior fija mobile con safe area (`pb-safe-bottom`):
    - Botón primario de confirmación destacado (`h-12 w-full`), resumen de estado y botón sutil de vaciar lista.
    - Totalmente desacoplado del scroll interno mediante la propiedad `footer` de `Modal` con `mobileFullScreen={true}`.
- [x] **Fase 4: Verificación Visual con Playwright (After Screenshots)**
  - [x] Regenerar capturas en 375px, 430px, 768px y 1440px.
  - [x] Probar flujo completo: abrir -> selector -> uploader -> selección -> completar info -> eliminar -> confirmar.
  - [x] Touch targets audit: 0 violaciones en componentes de la app (solo 1 elemento de dev tools de Next.js detectado).
- [x] **Fase 5: Pruebas Unitarias y Verificación de Tipos**
  - [x] Actualizar y pasar unit tests: 33/33 pruebas en `batch-receipt-uploader.test.tsx` y `add-transaction-menu.test.tsx`, 102/102 pruebas en toda la suite de componentes.
  - [x] Ejecutar `npm run type-check`: 0 errores en TypeScript.

## 3. Resultados de la Verificación Interactiva

1. **Touch Targets**:
   - Antes: 16 objetivos interactivos con áreas inferiores a 40px (ej. "Hoy" 20x15px, "Gasto"/"Ingreso" 24x26px, "Confirmar" 32px, "Eliminar" 32x32px).
   - Después: Todos los botones, toggles, campos de formulario e iconos superan los 44-48px de área táctil mínima.
2. **Jerarquía Visual y Scroll en Mobile**:
   - Antes: Cada tarjeta mostraba 8 campos de entrada simultáneos (~500px de altura por tarjeta) y la barra inferior de guardado quedaba oculta fuera de la pantalla.
   - Después: Las tarjetas son compactas (~110px de altura cuando están listas) con modo acordeón enfocado. La barra de guardado se mantiene permanentemente fija sobre el pliegue inferior respetando las zonas seguras (`pb-safe-bottom`).
3. **Carga Inicial**:
   - Antes: Zona de "arrastrar y soltar" diseñada para ratón que no tenía sentido en teléfonos.
   - Después: Dos botones táctiles claros de 48px: `[ Elegir fotos ]` (galería con selección múltiple) y `[ Tomar foto ]` (cámara directa con `capture="environment"`).
