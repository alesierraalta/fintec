# Proposal: landing-revamp

## Intent

Rediseñar la landing de FinTec para que comunique una sola propuesta de valor —organizar las finanzas personales— y use las tasas como una utilidad integrada, no como cuatro versiones de la misma promesa. El cambio debe resolver el estado responsive defectuoso en móvil/iPad y convertir la siguiente visita en una señal medible del funnel, no limitarse a cambiar un breakpoint.

La propuesta conserva las fuentes y capacidades actuales, pero cambia su jerarquía, densidad y puesta en escena. No se implementa código en esta fase.

## Contexto y problema

La investigación del checkout `landing-revamp` encuentra tres capas de fricción relacionadas:

| Capa | Evidencia actual | Coste para el visitante |
| --- | --- | --- |
| **Narrativa** | El hero simula BCV y Binance P2P; `LiveRatesSection` vuelve a cargar las tasas reales; `StatsSection` repite BCV/P2P; `FeaturesSection` vuelve a prometer tasas en tiempo real. | No queda claro si FinTec es un gestor financiero o un comparador de divisas. La misma capacidad ocupa el lugar de demo, herramienta, prueba y feature. |
| **Responsive** | Panel glass externo con padding acumulado, tarjetas anidadas y un grid externo que pasa a dos columnas en `md` (768 px), aunque cada tarjeta sigue siendo compleja. | En iPad vertical aparece un falso estado desktop: dos herramientas estrechas, títulos/controles comprimidos y mayor riesgo de wrapping u overflow. En teléfonos la superficie útil se reduce aún más. |
| **Conversión** | El usuario reportó 22 visitas, 0 conversiones y bounce de 13 %. El CTA de registro compite con “Ver las tasas”; el flujo P2P puede terminar fuera de FinTec. No se encontró instrumentación específica del funnel. | No hay un camino primario inequívoco ni evidencia suficiente para saber si el problema es el mensaje, la utilidad de tasas, el registro o la salida externa. |

La muestra no permite atribuir causalidad ni evaluar un uplift porcentual. Sí justifica reducir ambigüedad e instrumentar el recorrido antes de optimizar claims.

## Resultado de producto propuesto

La landing debe hacer que un visitante pueda responder, en pocos segundos:

1. **Qué es FinTec:** el lugar para organizar sus finanzas en Venezuela.
2. **Qué puede hacer ahora:** entender un movimiento, presupuesto o decisión con una demostración breve.
3. **Dónde consultar tasas:** una utilidad secundaria, canónica y honesta sobre su frescura.
4. **Qué debe hacer después:** crear su cuenta para obtener un resultado concreto, no solo “comenzar gratis”.

Principios de la solución:

- una promesa por capacidad;
- una sola superficie canónica para tasas;
- divulgación progresiva para detalles financieros;
- evidencia verificable, nunca métricas inventadas;
- una composición que se adapte al ancho real disponible;
- medición de intención antes de sacar conclusiones con tráfico pequeño.

## Solución propuesta de alto nivel

### 1. Capa narrativa: del catálogo de features a una decisión concreta

- Reescribir el hero alrededor de un resultado de gestión financiera y un CTA primario de registro orientado a ese resultado, por ejemplo crear el primer presupuesto o registrar el primer movimiento.
- Sustituir el mock de tasas del hero por un único artefacto visual de producto: un **decision canvas** que conecte movimiento → presupuesto → decisión. Los datos demostrativos deben estar rotulados como demo y no competir semánticamente con datos en vivo.
- Mantener, como máximo, un teaser compacto que ancle a la utilidad de tasas; no duplicar allí las tarjetas BCV y Binance.
- Convertir `StatsSection` en una franja de evidencia no redundante: capacidades comprobables, límites claros del producto, seguridad explicada sin claims no verificables o una historia de uso cuando exista evidencia real.
- Retirar la tarjeta de tasas de `FeaturesSection` o transformarla en una capacidad distinta de gestión. Pricing y el CTA final deben continuar la misma narrativa, no reabrir la elección entre “registrarse” y “consultar tasas”.

### 2. Capa de utilidad: un `Rate Cockpit` canónico

La dirección recomendada es una única sección de tasas con un resumen legible y modos BCV/P2P bajo demanda. El cockpit conservaría la utilidad actual —fuente, valor, frescura, tendencias/comparaciones cuando estén disponibles, convertidor y ofertas P2P—, pero no mostraría toda la complejidad a la vez.

- El resumen inicial prioriza valor actual, fuente, última actualización y acción principal.
- Los detalles se abren mediante tabs/segmentos o disclosure explícito; los controles largos y resultados P2P se apilan en móvil y tablet estrecha.
- La sección conserva la advertencia y el enlace externo de Binance cuando corresponda; la salida externa debe medirse.
- El estado de Binance debe tener un único propietario dentro de la landing. `BCVRates` y el wrapper actual crean instancias separadas de `useBinanceRates`; el diseño debe pasar un snapshot compartido o recolocar la comparación para evitar trabajo y estados duplicados sin alterar el contrato global del hook.
- La carga diferida de las tasas se conserva para no convertir la herramienta secundaria en coste del primer render. El fallback sin `IntersectionObserver`, loading, error y retry forman parte de la experiencia, no son casos invisibles.

### 3. Capa visual: glass editorial con una señal de mercado

La dirección visual recomendada combina el sistema glass morphism iOS-native de FinTec con una composición editorial de alta señal:

- una superficie dominante por bloque, con profundidad, borde y sombra semánticos, en lugar de tarjetas glass anidadas;
- un pulso o línea de señal que conecte el artefacto del hero con el cockpit de tasas, funcionando como motivo memorable sin fingir una gráfica financiera real;
- tipografía de display para la promesa y números tabulares para valores financieros, con acentos semánticos para estado, frescura y acción;
- una única secuencia de entrada escalonada y transiciones intencionales; respetar `prefers-reduced-motion`;
- composición asimétrica y solapes controlados en desktop, reducidos a una lectura lineal en móvil.

La innovación no es añadir decoración a las tarjetas existentes: es hacer visible la cadena de decisión del usuario y reservar la densidad de datos para una sola herramienta que la necesita.

### 4. Capa responsive y de confianza

- Diseñar desde un ancho mínimo de 320 px, con controles de al menos 44 px y campos de 16 px o más en móvil.
- Mantener el cockpit en una columna durante móvil y tablet vertical; activar dos columnas solo cuando el contenedor tenga espacio suficiente para cada herramienta, no simplemente al cruzar `md`. La implementación deberá validar el breakpoint final o una estrategia basada en el ancho del contenedor.
- Reducir padding y radios acumulados, aplicar `min-w-0` donde corresponda, apilar cabeceras/acciones y evitar que textos de frescura, límites u ofertas fuerzen el ancho.
- Auditar 320/375/390/430 px, iPad vertical y horizontal, Safari/iPad y fallback sin observador. La condición de éxito es ausencia de overflow horizontal real y una densidad que permita leer y accionar sin compresión.
- Mostrar estados honestos de datos: en vivo, última actualización, fallback, error y retry. Nunca presentar un valor de fallback como si fuera fresco.

### 5. Capa de medición

Añadir un contrato mínimo de eventos, sin datos personales, para observar el funnel:

- click del CTA primario del hero;
- apertura/interacción del cockpit y selección de fuente;
- inicio y finalización del registro;
- click de salida hacia Binance;
- error o estado fallback de tasas.

Los nombres definitivos y el adaptador se fijarán en diseño contra la infraestructura de analytics existente. El primer lanzamiento debe generar una línea base de intención; no se debe declarar éxito o fracaso con las 22 visitas actuales.

## Proposal question round

Estas preguntas buscan mejorar el PRD/proposal cerrando reglas de negocio, expectativas de usuarios, implicaciones, casos límite y trade-offs de producto. No son preguntas de harness ni de entrega. El usuario puede responderlas, saltarlas, corregir el encuadre o pedir una segunda ronda. Mientras no se respondan, las recomendaciones marcadas son defaults de trabajo, no decisiones irreversibles.

### 1. ¿Cómo debe presentarse la capacidad de tasas?

- **A — Un `Rate Cockpit` con resumen y tabs BCV/P2P (recomendada):** una sola superficie, comparación y detalle bajo demanda. **Pros:** elimina la repetición visual, reduce la densidad en iPad y mantiene ambas intenciones. **Contras:** comparar ambas fuentes requiere una interacción adicional y puede ocultar detalle a usuarios expertos.
- **B — Una sección con dos tarjetas simultáneas:** conservar BCV y P2P lado a lado, pero simplificar estilos y controles. **Pros:** comparación inmediata, menor cambio conceptual. **Contras:** mantiene el principal riesgo de ancho y sigue haciendo que la landing parezca una herramienta de mercado.
- **C — Mostrar BCV y enlazar P2P fuera de la landing:** **Pros:** máxima claridad y menor coste responsive. **Contras:** pierde utilidad diferencial y aumenta la salida hacia un tercero.

**Fundamento de la recomendación:** una superficie canónica resuelve a la vez duplicación y densidad sin quitar las dos fuentes.

### 2. ¿Cuál debe ser la narrativa y CTA primarios?

- **A — Gestión financiera primero, tasas como ruta secundaria (recomendada):** CTA principal orientado a un primer resultado (“Crear mi primer presupuesto” o equivalente) y CTA secundario “Consultar tasas”. **Pros:** aclara el producto, ordena el funnel y reduce clicks que terminan fuera. **Contras:** puede ser menos atractivo para quien llega buscando solo BCV/P2P.
- **B — Tasas primero:** hero centrado en la cotización y registro como siguiente paso. **Pros:** captura intención explícita de búsqueda. **Contras:** refuerza la ambigüedad actual y puede optimizar visitas sin conversión.
- **C — Dos rutas igualmente primarias:** “Organizar mis finanzas” y “Consultar tasas” con el mismo peso. **Pros:** no fuerza una sola intención. **Contras:** conserva la carga de decisión que hoy compite en el primer viewport.

**Fundamento de la recomendación:** el producto y el CTA deben conducir a una acción que ocurra dentro de FinTec, sin negar un acceso claro a las tasas.

### 3. ¿Qué dirección visual debe anclar el rediseño?

- **A — `Decision canvas` editorial + pulso de mercado (recomendada):** glass oscuro de FinTec, tipografía expresiva, composición asimétrica y una señal visual que conecte movimiento, presupuesto y decisión. **Pros:** memorable, explica el resultado y diferencia la landing de un dashboard genérico. **Contras:** exige disciplina para que la metáfora no se confunda con datos reales.
- **B — Mock de dashboard refinado:** mejorar el mock actual con una vista de producto más pulida. **Pros:** familiar y fácil de relacionar con la app. **Contras:** puede seguir pareciendo un catálogo de paneles y no resuelve por sí solo la jerarquía.
- **C — Estética terminal/mercado:** ticker, cotizaciones y señales como protagonista. **Pros:** fuerte para audiencia que busca tasas. **Contras:** desplaza el posicionamiento hacia trading/comparación y puede aumentar densidad.

**Fundamento de la recomendación:** combina el sistema visual existente con una idea reconocible sin añadir una segunda herramienta ficticia.

### 4. ¿Qué evidencia debe reemplazar a los stats redundantes?

- **A — Evidencia verificable del producto, sin números no demostrados (recomendada):** beneficios/garantías comprobables, límites de plan y estado beta explícito; incorporar testimonios solo cuando sean reales. **Pros:** protege credibilidad y es publicable ahora. **Contras:** tiene menos fuerza social hasta contar con usuarios y citas.
- **B — Solo prueba social real y consentida:** retirar la franja hasta disponer de testimonios, logos o métricas verificadas. **Pros:** máxima honestidad y foco. **Contras:** deja un espacio de confianza débil en el corto plazo.
- **C — Placeholders de early access claramente etiquetados:** usar testimonios o métricas provisionales con una etiqueta visible. **Pros:** permite explorar el formato y aporta contexto humano. **Contras:** aun etiquetado puede percibirse como prueba fabricada y generar deuda de reemplazo.

**Fundamento de la recomendación:** con evidencia social inexistente en la exploración, los hechos verificables son preferibles a rellenar la página con autoridad aparente.

### 5. ¿Qué regla de producto aplica cuando una tasa está vieja o falla?

- **A — Mantener la utilidad con estado explícito (recomendada):** mostrar valor disponible, fuente, edad/frescura, etiqueta de fallback, error/retry y advertencia correspondiente. **Pros:** no deja un hueco para quien necesita la tasa y preserva la confianza. **Contras:** agrega estados visuales y puede reducir el atractivo de una cifra “limpia”.
- **B — Ocultar valores no frescos:** mostrar la herramienta solo cuando la fuente esté dentro del umbral acordado. **Pros:** evita que un visitante confunda un dato viejo con uno en vivo. **Contras:** deja un estado vacío frecuente y elimina la utilidad precisamente cuando más contexto necesita.
- **C — Sustituir por snapshot fijo:** presentar una referencia estática y derivar el detalle a otra ruta. **Pros:** comportamiento estable y simple. **Contras:** contradice la promesa de tasas en vivo y no resuelve la intención de consulta actual.

**Fundamento de la recomendación:** la transparencia de estado es más segura que ocultar o maquillar datos; el umbral de frescura debe quedar definido en la especificación.

### 6. ¿Cómo debe validarse el efecto en conversión?

- **A — Instrumentar primero y comparar después de una línea base (recomendada):** registrar los eventos del funnel, revisar calidad de datos y observar el rediseño contra el baseline antes de fijar un objetivo porcentual. **Pros:** evita conclusiones falsas con 22 visitas, identifica el punto de fuga y permite iterar copy/CTA. **Contras:** retrasa una afirmación de uplift y requiere acordar definiciones de “registro iniciado” y “completado”.
- **B — Lanzar un A/B test inmediato:** repartir tráfico entre la landing actual y la nueva. **Pros:** marco experimental claro si llega suficiente tráfico. **Contras:** la muestra actual no tiene potencia práctica y puede producir una decisión basada en ruido.
- **C — Publicar sin instrumentación y mirar conversiones finales:** **Pros:** menor trabajo inicial. **Contras:** no permite distinguir una mejora de mensaje, una interacción de tasas o un fallo del registro.

**Fundamento de la recomendación:** la instrumentación es el mínimo necesario para transformar el dato “0 conversiones” en diagnóstico; un A/B formal puede evaluarse cuando exista volumen.

## Scope

### In scope

- Reorganización de la composición pública y jerarquía de contenido de `LandingPage`.
- Rediseño visual/narrativo del hero, prueba de valor, features, pricing/CTA y footer cuando sea necesario para sostener la nueva progresión.
- Sustitución del bloque actual por una experiencia canónica de tasas con divulgación progresiva y estados de datos explícitos.
- Corrección responsive y auditoría de overflow en teléfonos, iPad vertical/horizontal y Safari.
- Eliminación del propietario duplicado de estado Binance en la landing, sin cambiar la semántica global del hook.
- Instrumentación mínima del funnel y de los estados críticos de tasas.
- Validación de accesibilidad básica, touch targets, reduced motion, carga diferida y ausencia de regresión en el primer render.

### Out of scope

- Cambiar scrapers, cálculos, fuentes, API, tablas, RLS o esquema de Supabase.
- Rediseñar el dashboard autenticado, `/accounts` u otros flujos de la aplicación.
- Cambiar precios, planes, permisos, modelo de negocio o flujo de autenticación.
- Crear un CMS, pipeline de testimonios, nuevos perfiles sociales o métricas de usuarios que no existan.
- Hacer que Binance sea una integración interna de FinTec o garantizar disponibilidad de un tercero.
- Convertir esta fase en una reescritura completa de la marca o en una biblioteca de componentes nueva.

## Capabilities

### Modified capabilities

- **Landing pública:** pasa de múltiples promesas de tasas a una narrativa de gestión financiera con una utilidad secundaria canónica.
- **Live rates en landing:** conserva BCV/P2P, loading y lazy loading, pero añade jerarquía, estado de frescura, divulgación progresiva y estrategia de ancho suficiente.
- **Observabilidad de conversión:** incorpora señales de intención y de salida para poder diagnosticar el funnel.

### New capabilities

No se propone una capacidad de dominio o backend nueva. La única adición funcional es la observabilidad mínima del recorrido público.

## Áreas afectadas

| Área | Impacto | Tratamiento propuesto |
| --- | --- | --- |
| `app/(public)/components/landing-page.tsx` | Modificado | Reordenar/ensamblar las capas de narrativa, evidencia, cockpit y conversión, manteniendo intacta la rama autenticada. |
| `hero-section.tsx` | Modificado | Reemplazar el mock de tasas por el `decision canvas`, CTA primario y teaser secundario opcional. |
| `live-rates-section.tsx` | Modificado o extraído | Convertirlo en el límite del `Rate Cockpit`, con layout dependiente del ancho real, disclosure, estados y lazy loading. |
| `components/currency/bcv-rates.tsx` y `binance-rates.tsx` | Revisado/adaptado | Reutilizar lógica y fuentes; ajustar la superficie de presentación o props para que el cockpit sea el único dueño visual/estado de la landing. |
| `hooks/use-binance-rates.ts` | Seam a verificar | Preferir una modificación mínima para compartir el snapshot en la landing; no cambiar el contrato usado por otras pantallas. |
| `stats-section.tsx`, `features-section.tsx`, `data.ts` | Modificados | Retirar claims redundantes y alimentar evidencia verificable, sin placeholders que parezcan métricas reales. |
| `pricing-preview-section.tsx`, `cta-section.tsx` | Ajustados | Continuar la narrativa y evitar repetición de CTA sin contexto. |
| Adaptador de analytics y flujo de registro | Revisado | Conectar eventos definidos en la propuesta sin enviar PII; resolver dónde se confirma “registro completado”. |
| Tests de componentes/E2E | Nuevos o modificados | Cubrir estados del cockpit, viewport matrix, overflow, navegación accesible y eventos críticos. |

No se esperan migraciones de base de datos.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Quitar las tasas del hero reduce el atractivo para visitantes con intención BCV/P2P. | Mantener un teaser/ancla visible, conservar el cockpit y medir su apertura/selección antes de retirar esa ruta. |
| Tabs o disclosure hacen que un usuario experto no vea ambas fuentes de inmediato. | Mostrar fuente/valor/frescura en el resumen, conservar acceso de un toque y validar con la decisión de la pregunta 1. |
| La prueba de valor sin social proof parece demasiado abstracta. | Usar solo evidencia comprobable, marcar beta/demo y crear un camino claro para incorporar testimonios reales después. |
| Un rediseño visual introduce claims o datos demo que parecen reales. | Etiquetar demos, no inventar métricas, separar semánticamente decoración de datos y revisar contraste/lectura. |
| El cockpit sigue fallando en un iPad o Safari no soporta el lazy path igual. | Probar viewport y fallback sin `IntersectionObserver`; mantener skeleton, retry y una composición de una columna para tablet estrecha. |
| Se conserva la duplicación de Binance en hooks o se cambia el comportamiento de otras pantallas. | Acotar el cambio al consumidor de landing, pasar un snapshot compartido y cubrir que no haya doble fetch/estado en ese flujo. |
| La muestra de tráfico produce una falsa sensación de mejora o fracaso. | Instrumentar primero, reportar eventos intermedios y no fijar uplift hasta contar con una línea base interpretable. |

## Rollback

- No hay migración ni cambio de contrato de API, por lo que el rollback no requiere restaurar datos.
- Mantener los componentes y fuentes actuales detrás de una composición reemplazable hasta validar el nuevo cockpit. Si el nuevo layout falla, restaurar el ensamblado anterior y conservar únicamente las correcciones responsive seguras.
- Revertir el cambio de composición/estilos en un commit; la instrumentación es aditiva y puede desactivarse o dejarse sin afectar el flujo de registro.
- Si el problema se limita al cockpit, volver temporalmente a `LiveRatesSection` en una columna y conservar el lazy loading, los estados de error/fallback y los eventos ya definidos.
- Si el problema es conversión, revertir copy/orden del CTA sin tocar la fuente de tasas ni la rama autenticada.

## Criterios de éxito

### Producto y contenido

- Existe una sola superficie canónica de tasas; hero, stats y features no presentan la misma capacidad como promesa independiente.
- La primera pantalla identifica FinTec como gestor de finanzas y ofrece un CTA primario inequívoco, con una ruta secundaria visible para quien busca tasas.
- La evidencia pública usa únicamente hechos verificables; demos, beta y fallbacks están rotulados.

### Responsive y accesibilidad

- En 320/375/390/430 px y en iPad vertical/horizontal no hay overflow horizontal real (`scrollWidth` no supera `clientWidth`) ni controles superpuestos.
- El cockpit permanece en una columna en tablet estrecha y solo divide contenido cuando cada columna conserva legibilidad.
- Las acciones y enlaces alcanzan 44 px, los inputs evitan zoom automático en iOS y navegación/estados siguen siendo utilizables con teclado y reduced motion.

### Datos y performance

- BCV y P2P conservan loading, valor, fuente, frescura, fallback, error y retry honestos; se mantienen las advertencias y enlaces externos pertinentes.
- La landing no crea dos propietarios de Binance ni una regresión observable de trabajo; las tasas siguen fuera del coste del primer render cuando no están cerca del viewport.

### Conversión y aprendizaje

- Los eventos de CTA, cockpit, registro, salida externa y estados de tasa llegan con nombres consistentes y sin PII.
- Se puede distinguir al menos `register_start` de `register_complete` y relacionarlos con la interacción previa, sujeto al adaptador de analytics existente.
- El lanzamiento produce una línea base de intención y un plan de revisión; cualquier objetivo porcentual de conversión se define después de observar volumen suficiente, no a partir de las 22 visitas actuales.

## Alternativas consideradas

1. **Parche mínimo de responsive:** cambiar `md` por un breakpoint mayor, reducir padding y quitar una tarjeta del hero. Es reversible y barato, pero deja la jerarquía duplicada, la ambigüedad de producto y la falta de medición.
2. **Conservar dos tarjetas de tasas y solo aplicar un restyle:** preserva la comparación inmediata, pero no resuelve la causa estructural del falso desktop de iPad ni la carga cognitiva.
3. **Eliminar por completo las tasas de la landing:** maximiza el foco en registro, pero pierde una intención legítima y un diferenciador de FinTec; se descarta salvo que la pregunta de producto priorice una landing exclusivamente de adquisición.
4. **Reescritura integral con CMS y nueva identidad visual:** permitiría resolver contenido, social proof y marca a la vez, pero introduce dependencias, retraso y alcance no justificado por la evidencia actual. La propuesta adopta un rediseño distintivo dentro del sistema existente y deja esa expansión para después.
5. **A/B test inmediato sin instrumentación previa:** parece cuantitativo, pero el volumen actual no permite interpretar el resultado y no identifica el punto de fuga. Se prefiere instrumentar y establecer baseline.
