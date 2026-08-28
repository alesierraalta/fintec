# Exploración — landing-revamp

## Estado de la investigación

- **Worktree:** `landing-revamp`, rama `fix/landing-revamp`.
- **Skill resolution:** `paths-injected` para el registry; `fintec-frontend-design`, `fintec-tailwind-patterns`, `mobile-ux-design` y `frontend-aesthetics` fueron resueltos y leídos. Los paths de frontend/tailwind del registry estaban desactualizados y se resolvieron en `fintec/skills/`.
- **CodeGraph:** índice disponible en el checkout base y consulta de símbolos ejecutada para la landing (`HeroSection`, `LiveRatesSection`, `StatsSection`, `FeaturesSection`, `BCVRates`, `BinanceRatesComponent`). No fue posible crear/consultar un índice independiente del worktree mediante el gateway disponible.
- **Context-mode:** el gateway MCP reportó `MCP not initialized`; no fue posible ejecutar `ctx_batch_execute`, `ctx_execute`, `ctx_execute_file` ni `ctx_search`. La inspección se hizo con consultas CodeGraph y lecturas puntuales como fallback.
- **Engram:** no hubo herramienta de búsqueda disponible para `mem_search`; los hallazgos se guardaron en `sdd/landing-revamp/explore` en el proyecto `fintec` antes de retornar.

## Arquitectura y flujo actual

`LandingPage` es un Server Component que monta esta secuencia:

```text
LandingNav
  -> HeroSection
  -> LiveRatesSection
       -> lazy BCVRates
       -> BinanceRatesComponentWrapper
            -> useBinanceRates
            -> lazy BinanceRatesComponent
  -> StatsSection
  -> FeaturesSection
  -> FAQSection
  -> PricingPreviewSection
  -> CTASection
  -> LandingFooter
```

### Hero

`HeroSection` comunica la propuesta “Tus finanzas, claras. Tus decisiones, mejores.” y tiene dos CTAs: registro (`/auth/register`) y ancla a `#tasas-en-vivo`. El mock visual muestra balance, cuentas, presupuesto, ahorro y movimientos. En el aside vuelve a presentar “Tasas de referencia” con dos tarjetas: BCV y Binance P2P. Son valores demostrativos (`Bs. —`), pero visualmente se parecen al producto real.

### LiveRates

`LiveRatesSection` es client-side y difiere la carga hasta que el bloque se aproxima al viewport (`IntersectionObserver`, `rootMargin: 300px`). Renderiza dos skeletons mientras carga y luego un grid externo `grid-cols-1 md:grid-cols-2`.

- Contenedor de sección: `px-4`, `sm:px-6`, `lg:px-8`.
- Panel envolvente: `rounded-3xl`, `p-6 sm:p-8 lg:p-10`.
- BCV: tarjeta `rounded-3xl`, `p-6`, `lg:p-8`; contiene USD/EUR en `grid-cols-1 sm:grid-cols-2`, comparaciones, tendencia, convertidor opcional y footer de estado.
- Binance: tarjeta independiente `overflow-hidden rounded-3xl`; header `px-4 py-5 sm:px-6`; controles, búsqueda de ofertas y resultados. El formulario usa `px-4` y sus campos pasan a dos columnas desde `sm`. Cada oferta pasa a dos columnas desde `sm`.

Un detalle de arquitectura relevante: `BCVRates` también ejecuta `useBinanceRates()` para comparar BCV contra Binance, mientras el wrapper de la sección ejecuta otra instancia de `useBinanceRates({ enabled: true })` para la tarjeta Binance. Esto puede duplicar trabajo/estados de Binance, aunque no es por sí solo la causa del apretamiento visual.

### Stats

`StatsSection` presenta cuatro tarjetas de confianza:

1. “Tasas BCV / Fuente oficial”.
2. “Mercado P2P / Referencia actualizada”.
3. “Acceso flexible / Donde estés”.
4. “Privacidad / Tus datos son tuyos”.

Es una repetición conceptual de las tasas y del claim de acceso móvil que ya aparecen en Hero, LiveRates y Features.

### Features y cierre

`FeaturesSection` repite “Tasas en Tiempo Real” como funcionalidad, además de gestión, seguridad y diseño adaptable. Después siguen FAQ, tres planes de pricing y un CTA final de registro/login.

## Causas de duplicación

### Duplicación triple de tasas

1. **Hero:** mock de BCV + Binance P2P bajo “Tasas de referencia”. Aunque está marcado como demostrativo, ocupa el mismo espacio semántico que una tasa real y crea expectativa de una segunda herramienta.
2. **LiveRatesSection:** fuente real, con BCV y explorador de ofertas P2P.
3. **StatsSection:** vuelve a listar BCV y P2P como indicadores de confianza, no como métricas nuevas.
4. **FeaturesSection:** vuelve a prometer “Tasas en Tiempo Real”.

La raíz no es un componente aislado: es una decisión de jerarquía de contenido que trata la misma capacidad (consultar tasas) como demo hero, herramienta principal, prueba de confianza y feature. El visitante debe procesar la misma promesa varias veces antes de llegar a gestión financiera, pricing o registro.

### Recomendación de arquitectura de contenido

- Mantener **una sola demostración de tasas** en el hero: o bien un mock reducido de producto sin tasas, o bien un teaser que enlace al bloque real, pero no ambos.
- Convertir LiveRates en una sección de utilidad explícita y acotada (“Consulta BCV y compara P2P”), con un único objetivo secundario.
- Reemplazar Stats por evidencia no redundante: límites del plan gratuito, seguridad explicada de forma verificable, ahorro de tiempo o una mini-historia de uso. No repetir BCV/P2P.
- En Features, eliminar la tarjeta de tasas si LiveRates sigue visible o transformarla en una capacidad de gestión distinta.

## Bug móvil/iPad: causa raíz probable

La causa estructural más probable es **densidad acumulada dentro de una tarjeta de ancho limitado**, no un único `overflow` accidental:

1. El panel externo usa padding `p-6` en móvil y cada hijo vuelve a tener `p-6`; en un teléfono quedan pocos píxeles útiles para texto, botones y controles.
2. `BCVRates` y Binance usan tarjetas `rounded-3xl` anidadas dentro de otra tarjeta `rounded-3xl`, aumentando bordes, padding y sensación de compresión.
3. El grid externo solo cambia a dos columnas en `md` (768px). En el rango móvil/tablet pequeño cada tarjeta ocupa el ancho completo, pero internamente sigue conteniendo muchas filas, badges, estados, comparaciones y controles.
4. El primer breakpoint de dos columnas interno es `sm` (640px). En iPad vertical (~768px CSS px) el contenedor externo ya puede tener dos columnas, mientras cada columna queda estrecha: `max-w-7xl` no ayuda porque el viewport sigue limitado y el panel conserva `lg` desactivado pero `sm` activado. El resultado es dos herramientas complejas lado a lado.
5. La cabecera de Binance usa `flex items-start justify-between gap-4`; el título/descripción y el botón de refresh compiten por el ancho. En iPad estrecho, el botón reserva 44px y el texto largo se ajusta agresivamente.
6. Binance contiene textos largos, límites monetarios, chips de métodos de pago y botones full-width. Los elementos sí tienen `min-w-0` en puntos importantes y los resultados usan `sm:grid-cols-2`, pero no existe una estrategia de “modo tablet estrecho” que mantenga una sola columna para la sección completa.
7. BCV tiene encabezados, badges de tendencia y controles; varias agrupaciones usan `justify-between` y valores largos. Los botones pasan a fila desde `sm`, mientras la anchura real de cada columna en el layout externo puede ser insuficiente.

**Diagnóstico:** el breakpoint `md` del grid de LiveRates es demasiado agresivo para dos tarjetas interactivas complejas. El iPad cae en un falso estado desktop: dos columnas externas, pero ancho interno de móvil. En PC el ancho disponible elimina la colisión; por eso el defecto no se reproduce visualmente igual en desktop.

### Verificaciones recomendadas antes de implementar

- Probar 320/375/390/430px y iPad vertical/horizontal, midiendo `scrollWidth` contra `clientWidth`.
- Inspeccionar overflow real de la cabecera Binance, badges de tendencia, límites de oferta y footer BCV.
- Probar `grid-cols-1` hasta un breakpoint mayor o usar una condición de ancho real del contenedor; no asumir que `md` equivale a espacio suficiente.
- Confirmar si el navegador reporta overflow horizontal o solo wrapping/densidad visual. Con la evidencia estática no puede afirmarse que `overflow-hidden` sea la causa primaria: el `overflow-hidden` de Binance recorta contenido, pero no genera por sí mismo la compresión.

## Jerarquía visual, CTA y conversión

Datos entregados por el usuario: **22 visitas en el último mes, 0 conversiones, bounce 13%**. La muestra es demasiado pequeña para inferir causalidad; el bounce bajo tampoco demuestra que el funnel esté funcionando, especialmente sin evidencia de instrumentación de eventos.

Fricciones observables:

- La primera pantalla mezcla gestión financiera, dashboard ilustrativo y tasas. No queda inequívoco si FinTec es una app para llevar finanzas o un comparador de divisas.
- “Comenzar gratis” compite con “Ver las tasas”; la segunda opción dirige a una herramienta real que puede satisfacer la intención del visitante sin registro.
- La propuesta usa beneficios generales (“claras”, “mejores”, “todo a la vista”) y no muestra un resultado concreto para un usuario venezolano antes de pedir registro.
- Hay CTAs de registro repetidos en hero, cards de pricing y CTA final, pero sin una progresión clara ni reducción de incertidumbre entre ellos.
- El bloque P2P es una herramienta de alta complejidad y termina con “Continuar en Binance”; puede desviar la conversión fuera de FinTec.
- La sección real aparece después de un mock que ya prometió tasas y luego antes de cuatro tarjetas que vuelven a resumirlas: mucho scroll para poca información nueva.
- Pricing aparece tarde y contiene tres planes, cifras y listas largas. Puede introducir decisión de compra antes de que el visitante entienda el “aha moment”.
- El hero declara beta/acceso anticipado, pero no explica con suficiente precisión qué obtiene el usuario en los primeros cinco minutos ni qué riesgo existe al registrarse.
- No se encontraron referencias de tracking de conversiones específicas en la búsqueda puntual. Deben instrumentarse al menos clicks del CTA hero, scroll/interaction con LiveRates, inicio/completado de registro y salida a Binance.

### Funnel sugerido para validar

1. Hero: una promesa concreta + CTA primario; demo breve de organizar una cuenta/movimiento.
2. Prueba: una sola evidencia de valor, no cuatro resúmenes repetidos.
3. Utilidad secundaria: tasas en vivo colapsables o claramente etiquetadas como herramienta aparte.
4. Confianza: privacidad/seguridad y beta en lenguaje verificable.
5. Registro: CTA persistente con una razón inmediata (“crea tu primer presupuesto”, no solo “comenzar gratis”).

## Riesgos

- Quitar tasas del hero puede reducir atractivo para visitantes que llegan buscando BCV/P2P; debe conservarse un teaser o ancla clara.
- Simplificar Stats sin reemplazar la prueba de confianza puede debilitar credibilidad.
- La carga diferida depende de IntersectionObserver; el fallback sin soporte carga las tarjetas, pero se debe validar comportamiento en Safari/iPad.
- BCV tiene datos, tendencias, convertidor y estados de fallback; reducir superficie sin comunicar frescura puede ocultar información importante.
- Binance muestra datos públicos que pueden cambiar; la advertencia legal debe permanecer si la sección continúa.
- Con 22 visitas, experimentos de conversión necesitarán más tiempo o una métrica de intención intermedia para ser interpretables.

## Oportunidades de innovación/diseño

- **Dos modos de entrada:** “Organiza tus finanzas” como ruta primaria y “Consulta tasas” como ruta secundaria, sin hacer que ambas parezcan el mismo producto.
- **Hero orientado a resultado:** una composición editorial con un solo momento memorable (por ejemplo, movimiento → presupuesto → decisión), dejando las tasas como módulo contextual.
- **Rate cockpit responsive:** un único panel de tasas con tabs BCV/P2P, lectura compacta y convertidor bajo demanda; en móvil, una columna y acciones apiladas; en tablet, no activar dos columnas hasta que el container tenga ancho suficiente.
- **Progresive disclosure:** ocultar tendencias, comparaciones y detalles de ofertas hasta una interacción explícita; mostrar primero precio, frescura y acción.
- **Prueba de valor medible:** mini flujo “registra una cuenta / agrega movimiento / ve presupuesto” con datos demostrativos claramente etiquetados.
- **Mobile-first glass:** conservar glass morphism, pero con una sola superficie dominante por bloque, padding móvil reducido y controles de 44px; evitar tarjetas glass anidadas sin necesidad.
- **CTA contextual:** copy distinto para visitante que quiere gestionar (`Crear mi cuenta`) frente a quien busca tasas (`Ver tasa BCV`), con tracking separado.

## Prioridad de trabajo sugerida

1. Corregir el layout de LiveRates para que tablet estrecha permanezca en una columna y auditar overflow real.
2. Reducir la duplicación: retirar tasas del mock hero o convertirlo en mock de gestión; sustituir/replantear Stats.
3. Aclarar en hero que FinTec es primero gestión financiera para Venezuela y que las tasas son una utilidad integrada.
4. Instrumentar funnel y eventos antes de optimizar claims usando la muestra actual.
5. Re-evaluar pricing/CTA después de observar interacción real con la propuesta principal.
