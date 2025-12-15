# PRD-0006: Optimización Integral de UI/UX Mobile

## 1. Introducción
La versión móvil de la plataforma FINTEC actualmente presenta una experiencia de usuario que, aunque funcional, se percibe como una adaptación directa del escritorio ("versión encogida") y carece de la fluidez y ergonomía de una aplicación móvil nativa. Este documento define los requisitos para una revisión y refactorización integral de la interfaz móvil, priorizando la ergonomía ("thumb-friendly"), la claridad en la visualización de datos y la optimización de interacciones.

## 2. Objetivos
*   **Ergonomía:** Rediseñar la navegación y los controles interactivos para que sean fácilmente operables con una sola mano (zona del pulgar).
*   **Legibilidad:** Adaptar las tablas y gráficos complejos para que sean digeribles en pantallas verticales pequeñas sin scroll horizontal excesivo.
*   **Sensación Nativa:** Implementar patrones de diseño móvil (Bottom Sheets, Bottom Navigation, Headers fijos) para mejorar la percepción de calidad y velocidad.
*   **Consistencia:** Unificar tamaños de fuentes, botones y espaciados para evitar la sensación de elementos "apretados".

## 3. Historias de Usuario
1.  **Como usuario móvil**, quiero una barra de navegación inferior (Bottom Tab Bar) para cambiar rápidamente entre mis cuentas, transacciones y reportes sin tener que estirar el dedo hacia una hamburguesa en la esquina superior.
2.  **Como usuario**, quiero que los formularios de edición (ej. crear transacción) se abran en un panel deslizante desde abajo (Bottom Sheet) en lugar de un modal central pequeño, para tener más espacio y foco.
3.  **Como usuario**, quiero ver mis listas de transacciones como tarjetas limpias y verticales, no como una tabla comprimida con columnas cortadas.
4.  **Como usuario**, quiero poder hacer gestos (swipe) en las listas para acciones rápidas como borrar o editar, para agilizar mi gestión diaria.
5.  **Como usuario**, quiero que los gráficos del dashboard se apilen verticalmente y usen todo el ancho, para poder leer los números sin hacer zoom.

## 4. Requerimientos Funcionales

### 4.1. Navegación y Estructura
*   **FR-01 (Bottom Navigation):** Implementar una barra de navegación inferior fija para las secciones principales (Inicio, Transacciones, Presupuesto, Perfil) visible solo en mobile.
*   **FR-02 (Header Simplificado):** Reducir la altura del header superior, dejando solo el título de la sección y acciones secundarias (notificaciones), ganando espacio vertical.
*   **FR-03 (Bottom Sheets):** Reemplazar los modales `Dialog` centrales por `Drawer` o `Sheet` (componentes tipo Shadcn/Vaul) que emergen desde abajo para formularios y detalles.

### 4.2. Visualización de Datos
*   **FR-04 (Tablas a Tarjetas):** Detectar viewport móvil y transformar las tablas de datos (`<Table>`) en listas de tarjetas (`<Card>`) donde cada fila es un bloque con título, subtítulo y monto destacado.
*   **FR-05 (Gráficos Responsivos):** Configurar los gráficos (Recharts/Echarts) para ocultar leyendas o ejes innecesarios en mobile y asegurar que el contenedor tenga altura fija suficiente.

### 4.3. Interacciones y Gestos
*   **FR-06 (Swipe Actions):** Añadir capacidad de deslizar (swipe-left/right) en los ítems de lista de transacciones para "Editar" y "Eliminar".
*   **FR-07 (Pull-to-Refresh):** Implementar gesto de arrastrar hacia abajo para recargar los datos en las vistas principales.

### 4.4. Formularios
*   **FR-08 (Teclados Específicos):** Asegurar que todos los inputs numéricos (montos) disparen el teclado numérico del móvil (`inputMode="decimal"`).
*   **FR-09 (Touch Targets):** Aumentar el tamaño mínimo de cualquier botón o enlace interactivo a 44x44px.

## 5. Requerimientos No Funcionales
*   **Performance:** Las animaciones de apertura de Bottom Sheets y transiciones de navegación deben correr a 60fps.
*   **Adaptabilidad:** El diseño debe funcionar correctamente en dispositivos pequeños (iPhone SE) y grandes (Pro Max / Androids grandes).

## 6. Fuera de Alcance (Non-Goals)
*   Desarrollo de una App nativa (React Native/Flutter). Se mantiene como Web App (PWA).
*   Cambios en la lógica de negocio o backend. Solo es capa de presentación.

## 7. Consideraciones Técnicas
*   **Librerías UI:** Aprovechar `vaul` (para drawers) o componentes de Shadcn UI móvil.
*   **Media Queries:** Uso intensivo de Tailwind CSS breakpoints (`md:hidden`, `lg:block`) para renderizado condicional.
*   **PWA:** Revisar el `manifest.json` para asegurar que la barra de estado del navegador combine con el color de la app (theme-color).

## 8. Criterios de Éxito
*   La navegación entre secciones principales se puede realizar con el pulgar sin reajustar el agarre del teléfono.
*   No existen tablas con scroll horizontal en las vistas principales (se ven como tarjetas).
*   Lighthouse Mobile Score de Accesibilidad y Best Practices > 90.

## 9. Preguntas Abiertas
*   ¿Qué items específicos deben ir en la Bottom Bar (máximo 4-5)? (Propuesta: Home, Transacciones, Añadir (+), Reportes, Perfil).
