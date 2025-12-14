# PRD-0005: Estrategia Integral de Pruebas y Calidad de Código

## 1. Introducción
Este documento define la estrategia para implementar una suite de pruebas exhaustiva en la plataforma FINTEC. El objetivo principal es asegurar la estabilidad y fiabilidad del sistema mediante una cobertura de código cercana al 100%, utilizando las herramientas existentes (Jest y Playwright) y una estrategia de "Full Mocking" para dependencias externas. Se priorizará la auditoría y reparación de los tests existentes, expandiéndolos para cubrir flujos de usuario complejos y lógica unitaria crítica.

## 2. Objetivos
*   **Cobertura Total:** Alcanzar el máximo porcentaje posible de cobertura de código (Code Coverage) en unitarios y de integración.
*   **Estabilidad de E2E:** Reparar y estabilizar la suite actual de Playwright (`tests/01` a `tests/19`), eliminando la fragilidad (flakiness) mediante mocking de datos.
*   **Simulación de Procesos:** Validar flujos de negocio complejos (ej. ciclos de suscripción, presupuestos) sin depender de datos en vivo.
*   **Ejecución Local Eficiente:** Proveer scripts unificados para que los desarrolladores validen todo el sistema localmente antes de hacer commit.

## 3. Historias de Usuario
1.  **Como desarrollador**, quiero ejecutar un comando único (`npm run test:all`) que valide tanto la lógica unitaria como los flujos de usuario, para asegurar que mis cambios no rompan nada.
2.  **Como desarrollador**, quiero que los tests E2E no fallen por problemas de red o estado del servidor, por lo que necesito que todas las respuestas de API estén simuladas (mocked).
3.  **Como QA/Dev**, quiero verificar casos borde complejos (ej. fallo en pago de suscripción, expiración de sesión) que son difíciles de reproducir manualmente.
4.  **Como arquitecto**, quiero ver un reporte de cobertura detallado que me indique qué líneas de `lib/`, `hooks/` o `components/` no están siendo probadas.

## 4. Requerimientos Funcionales

### 4.1. Pruebas Unitarias (Jest)
*   **Cobertura de Librerías (`lib/`):** Tests exhaustivos para `currency-ves.ts`, `dates.ts`, `money.ts`, `rates.ts`, y validaciones.
*   **Cobertura de Hooks (`hooks/`):** Validar lógica de estado compleja en hooks como `use-auth`, `use-subscription`, `use-currency-converter`.
*   **Componentes UI (`components/`):** Tests de "snapshot" y comportamiento para componentes atómicos (botones, inputs) y moleculares (formularios, tablas).
*   **Mocking:** Uso intensivo de `jest.mock` para aislar funciones puras de dependencias externas.

### 4.2. Pruebas End-to-End y de Integración (Playwright)
*   **Auditoría y Reparación:** Revisar secuencialmente los archivos existentes en `tests/` (del 01 al 19+). Identificar fallos y refactorizar usando el patrón Page Object Model si es necesario.
*   **Estrategia de Mocking (Network Interception):** Implementar interceptores de red en Playwright (`page.route`) para simular respuestas de Supabase y APIs externas (Binance, BCV).
    *   *Nota:* No se debe conectar a la base de datos de producción ni desarrollo durante los tests.
*   **Flujos Complejos ("Simulación de Procesos"):**
    *   **Auth:** Registro, Login, Recuperación de contraseña, Logout, Sesión expirada.
    *   **Transacciones:** Creación, Edición, Eliminación, Categorización, Conversión de moneda.
    *   **Suscripciones:** Flujo completo de Upgrade/Downgrade, simulación de fallo de tarjeta, renovación.
    *   **Presupuestos:** Alertas de límite excedido, reseteo mensual.

### 4.3. Infraestructura de Pruebas
*   Configuración de reportes de cobertura (Istanbul/NYC para Jest, cobertura nativa para Playwright).
*   Scripts de `package.json` actualizados para ejecución granular (ej. `test:unit`, `test:e2e:auth`, `test:e2e:core`).

## 5. Requerimientos No Funcionales
*   **Velocidad:** Los tests unitarios deben ejecutarse en segundos. Los E2E deben estar optimizados (uso de paralelismo donde sea posible, aunque limitado por la naturaleza secuencial de algunos flujos).
*   **Independencia:** Ningún test debe depender del estado dejado por el anterior (aislamiento total mediante mocks).
*   **Mantenibilidad:** Código de prueba limpio, DRY (Don't Repeat Yourself) y bien documentado.

## 6. Fuera de Alcance (Non-Goals)
*   Configuración de pipelines de CI/CD (GitHub Actions) por el momento.
*   Pruebas de carga/estrés con K6 (aunque existe la carpeta, no es el foco de este sprint de calidad funcional).
*   Pruebas contra base de datos real (Live Database Testing).

## 7. Consideraciones Técnicas
*   **Stack:** Jest (Unit), Playwright (E2E/Integration).
*   **Mocking Libraries:** Jest nativo, Playwright Network Routes.
*   **Directorio de Tests:** Mantener la estructura actual `tests/` para E2E y archivos `__tests__` o `.test.ts` coubicados para unitarios (o en carpeta `tests/unit` si se prefiere separar).

## 8. Criterios de Éxito
*   100% de los tests existentes (`tests/01` a `tests/19`) pasan en verde consistentemente en entorno local.
*   Reporte de cobertura de código muestra >80% (aspiracional 100%) en módulos críticos de negocio.
*   Documentación clara sobre cómo correr y mantener los tests.
