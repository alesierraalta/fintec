# Design: First-Party Page Visits Analytics

## 1. Decisiones y resolución de contradicciones

La propuesta y la exploración confirman que el punto correcto de instrumentación es el middleware existente, que el agregado debe ser server-only y que ya existen `requireAdmin()`, `createServiceClient()`, `StatCard`, `glass-card` y Recharts.

La especificación contiene dos requisitos incompatibles con la decisión de privacidad solicitada. Este diseño los resuelve así:

- **No se persiste `user_agent`**. El User-Agent se lee únicamente en memoria para el filtro de bots y nunca forma parte del payload, de la tabla, de logs ni de la respuesta.
- **No se permite INSERT desde `anon` ni `authenticated`**. RLS se habilita sin políticas permisivas para clientes y se revocan sus privilegios directos; la única escritura usa `SUPABASE_SERVICE_ROLE_KEY` desde el middleware o un caller interno confiable. No se agrega un endpoint público de ingestión.
- La frase de la especificación sobre “INSERT anónimo/autenticado” y la columna `user_agent` debe considerarse supersedida por este diseño durante la implementación. No se modifica la autorización existente de `/admin`.
- Los administradores **sí cuentan**: la métrica cubre páginas públicas, autenticadas y administrativas. Los usuarios de prueba se excluyen antes de insertar, usando el contexto de sesión ya obtenido por el middleware. Esto evita contaminar métricas sin guardar `user_id`; no se intenta excluir admins en la agregación.
- El fallback `anon` aplica cuando no hay una IP confiable, no cuando falta el secreto. En ese caso se calcula un digest HMAC de un marcador anónimo. Si falta `PAGE_VISITS_HMAC_SECRET`, se omite el evento (fail closed), porque nunca se sustituye HMAC por IP cruda, hash sin clave o un identificador persistente.

El digest es diario: `HMAC-SHA256(PAGE_VISITS_HMAC_SECRET, "<UTC-date>:<normalized-ip>")`. Por tanto, “visitantes únicos” significa visitantes únicos por día (visitor-days); el total del rango es la suma de los buckets diarios y no pretende identificar a la misma persona entre fechas.

## 2. Arquitectura y flujo

```text
Document request
  -> middleware.ts
     -> matcher + isPageNavigation(request)
     -> updateSession(request, onUser)
        -> refresh Supabase session (existing seam)
        -> callback marks configured test user in memory
     -> construct/preserve NextResponse
     -> event.waitUntil(recordPageVisit(payload))
        or void Promise.resolve().then(recordPageVisit).catch(no-op)
           -> HMAC payload (no UA/IP persistence)
           -> service-role insert into page_visits

Admin /admin
  -> existing getAdminAccess()
  -> PageVisitsSection (client island)
     -> GET /api/admin/visits?range=30d
        -> requireAdmin()
        -> parse bounded range
        -> lib/page-visits/aggregation.ts
           -> service-role RPC/database aggregate
           -> zero-fill UTC days + peaks/top routes
        -> aggregate-only JSON envelope
```

La respuesta se construye después de `updateSession`, conservando cookies y headers de sesión. La tarea analítica se registra después, pero nunca se espera para devolver la navegación.

### Middleware y predicate compartido

`middleware.ts` cambiará la firma a `(request, event)` y mantendrá `updateSession` como la única operación de sesión. El matcher debe cubrir páginas y excluir desde el primer nivel:

```text
/((?!api(?:/|$)|_next(?:/|$)|static(?:/|$)|favicon\.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)
```

El matcher es una optimización, no la única defensa. `lib/page-visits/predicate.ts` también rechazará:

- métodos distintos de `GET`;
- `/api`, `/_next`, `/static`, favicon y extensiones de assets;
- RSC/prefetch/data headers (`rsc`, `next-router-prefetch`, `purpose: prefetch`, `x-nextjs-data`);
- requests cuyo `Accept` no sea de documento HTML cuando el header exista.

Un header User-Agent ausente sigue siendo elegible. La lista acotada y case-insensitive de bots incluye tokens como `bot`, `crawler`, `spider`, `slurp`, `headless`, `facebookexternalhit`, `bingpreview`, `lighthouse` y `curl`, evitando heurísticas demasiado amplias. El UA se descarta después del filtro.

`normalizePathname()` usa `new URL(request.url).pathname`, conserva solo el pathname, asegura `/`, colapsa separadores repetidos, elimina el slash final salvo para `/`, rechaza caracteres de control y limita longitud. Nunca accede a `search` para formar el evento.

Para excluir test users sin una segunda consulta de auth, `updateSession` aceptará un callback síncrono opcional invocado con el usuario devuelto por el `auth.getUser()` ya existente. El callback llama a `isTestUserEmail(user.email)` y deja un booleano en el closure de `middleware.ts`. Si la sesión no está disponible, el request se trata como anónimo; no se bloquea la página con un lookup adicional. Si cambiar el contrato de retorno es preferible, el mismo dato puede devolverse en un objeto interno, pero el caller actual seguirá recibiendo la misma `NextResponse`.

### Payload e ingestión

`lib/page-visits/ingest.ts` recibe un payload interno de `{ path, visitedAt, ipAddress?, country? }` y aplica nuevamente las validaciones defensivas. La extracción de IP considera de forma conservadora `x-real-ip` y el primer valor válido de `x-forwarded-for`; nunca registra los headers. IPv4-mapped IPv6 y espacios se normalizan. Si no hay IP confiable se usa el marcador `anonymous` dentro del HMAC diario.

`PAGE_VISITS_HMAC_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` son obligatorios para persistir. `createServiceClient()` se crea de forma lazy dentro de la tarea en segundo plano. La inserción contiene solo `path`, `visited_at`, `ip_hash` y, si existe un header geo confiable y validado, `country_code` de dos letras; no contiene cookies, sesión, usuario, UA o IP.

El schedule se difiere con `Promise.resolve().then(...)` para que incluso la creación del cliente service-role no ocurra en el critical path. En runtimes que entreguen `NextFetchEvent`, se llama `event.waitUntil(task)`; en el fallback se usa `void task.catch(() => undefined)`. Los errores se contabilizan con un log genérico sin datos de request, y jamás cambian status, headers o cookies de la respuesta.

## 3. Persistencia y RLS

Se agregará `supabase/migrations/<timestamp>_page_visits.sql` con:

- `page_visits.id uuid primary key default gen_random_uuid()`;
- `visited_at timestamptz not null default now()`;
- `visit_date date` generado/derivado de `visited_at` en UTC, no aceptado como dato del cliente;
- `path text not null` con check de slash inicial y longitud máxima;
- `ip_hash text not null` con check de digest hexadecimal SHA-256;
- `country_code char(2) null`, únicamente derivado y opcional;
- **sin** `user_agent`, `user_id`, raw IP, cookies, query string o metadata de auth.

Índices:

- `(visited_at, path)` para el contrato de fecha y ruta;
- `(visit_date, ip_hash)` para `COUNT(DISTINCT ip_hash)` diario;
- `(visit_date, path)` para top-routes dentro de una ventana.

`visit_date` permite particionado lógico por fecha: todas las consultas y el job de retención usan rangos UTC sobre esa columna. La primera versión mantiene una sola tabla para no añadir complejidad de creación de particiones mensuales, pero deja el límite de fecha y los índices listos para convertirla a particiones `RANGE` mensuales cuando el volumen lo justifique. La retención se ejecutará por lotes de `visit_date`, nunca con un scan sin límite.

La migración hará `ENABLE ROW LEVEL SECURITY` y no creará políticas `SELECT` o `INSERT` para `anon`/`authenticated`; además revocará sus privilegios de tabla para que un cliente no pueda escribir ni leer aunque intente usar PostgREST. No habrá políticas de update/delete para esos roles. El service role continúa siendo server-only y bypassa RLS. Si se crea una función SQL de agregado, será `SECURITY DEFINER`, fijará `search_path = public`, validará que `start_date < end_date`, tendrá un máximo de 90 días y revocará `EXECUTE` a `public`, `anon` y `authenticated`; solo se invocará desde el cliente service-role.

## 4. Agregación y API

### `lib/page-visits/aggregation.ts`

Este módulo será el único contrato de agregación y no expondrá filas de eventos. Define:

```ts
type VisitsRange = '7d' | '30d' | '90d';
type PageVisitsDTO = {
  range: VisitsRange;
  startDate: string; // UTC, inclusivo
  endDate: string;   // UTC, exclusivo
  totalPageViews: number;
  totalUniqueVisitors: number; // suma de únicos diarios
  daily: Array<{ date: string; pageViews: number; uniqueVisitors: number }>;
  topRoutes: Array<{ path: string; pageViews: number }>;
  peaks: {
    pageViews: { date: string; value: number } | null;
    uniqueVisitors: { date: string; value: number } | null;
  };
};
```

`parseVisitsRange()` acepta únicamente `7d`, `30d` o `90d`, con default `30d`. `startDate` es hoy UTC menos `days - 1` y `endDate` es mañana UTC; así cada rango contiene exactamente 7, 30 o 90 días calendario. Antes de crear el service client se rechaza cualquier valor inválido con el error de validación existente.

La consulta será una función SQL/RPC agregada en la misma migración (o el mecanismo SQL server-side equivalente si el repositorio lo estandariza). Recibe `[startDate, endDate)`, filtra por `visit_date`, usa `COUNT(*)`, `COUNT(DISTINCT ip_hash)` por día y agrupación por `path`, y devuelve como máximo 20 top routes. `generate_series(startDate, endDate - 1 day, interval '1 day')` genera todos los días para rellenar ceros. El agregado calcula los dos picos con desempate por fecha UTC más temprana. No se transfieren eventos crudos a Node ni al navegador.

La respuesta puede incluir `topRoutes` porque son conteos por pathname ya normalizado; no incluye query parameters, hashes, UA, IP o identidad. Un rango sin datos devuelve `daily` completo en ceros, totales `0` y ambos picos `null`.

### `app/api/admin/visits/route.ts`

La ruta será `dynamic = 'force-dynamic'`, usará `withErrorHandling`, `requireAdmin()` antes de parsear/consultar datos y `successResponse()`/`errorResponse()` existentes. Devuelve `Cache-Control: no-store` en éxito y error. El flujo es:

1. `await requireAdmin()`; una sesión ausente produce 401 y un usuario no admin 403.
2. Parsear `range`; un valor no soportado produce 400 sin tocar Supabase.
3. Llamar `getPageVisits(range)` de `aggregation.ts`, que crea el service client lazy y ejecuta el agregado.
4. Devolver únicamente `PageVisitsDTO` dentro del envelope estándar.

No se reutilizará la lógica de exclusión de admins de `lib/admin-stats/service.ts`: los admins sí son tráfico válido para esta métrica. `lib/admin/test-users.ts` se reutiliza en el callback de middleware; no hay manera segura ni necesaria de excluirlos posteriormente porque no se persiste `user_id`.

## 5. UI de administración

`app/admin/page.tsx` conserva exactamente sus ramas de auth/no-admin/admin y renderiza `PageVisitsSection` junto al `AdminStatsDashboard` ya existente. El nuevo componente client-side se ubicará en `components/admin/page-visits-section.tsx` (la superficie `/admin` lo compone) para seguir la organización actual de componentes de admin.

`PageVisitsSection`:

- inicia en `30d` y solo permite `7d`, `30d`, `90d`;
- solicita `/api/admin/visits?range=<range>` con `cache: 'no-store'` al cambiar el selector;
- reutiliza `StatCard` para visitas totales, visitantes únicos diarios y pico de tráfico;
- usa `.glass-card`, `DashboardLoading`/skeleton existente, `ResponsiveContainer` y `AreaChart` de Recharts, con dos series para page views y únicos;
- muestra un top-routes table con el pathname y conteo, sin detalles de eventos;
- muestra estado vacío con días en cero, error con reintento y labels en español.

No se crea una segunda guardia: el componente solo se monta después del guard server-side, y la API vuelve a verificarla. El repositorio actual usa copy española en el admin y no tiene un paquete de i18n dedicado; las nuevas etiquetas se centralizarán como claves del namespace `admin.visits` en el mecanismo de mensajes existente si está habilitado por el shell. Mientras el locale único siga siendo español, el fallback de esas claves será español y no se añadirá otra abstracción de traducción.

## 6. Archivos y contratos

### Nuevos

| Archivo | Responsabilidad |
| --- | --- |
| `lib/page-visits/types.ts` | Payload interno, `VisitsRange` y `PageVisitsDTO`. |
| `lib/page-visits/predicate.ts` | Matcher de página, normalización de path y filtro de bots. |
| `lib/page-visits/crypto.ts` | Normalización de IP y HMAC-SHA256 diario; nunca exporta IP persistible. |
| `lib/page-visits/ingest.ts` | Payload mínimo e insert service-role, con errores aislados. |
| `lib/page-visits/aggregation.ts` | Rangos, llamada SQL/RPC y materialización del DTO. |
| `app/api/admin/visits/route.ts` | Endpoint admin guardado y bounded. |
| `components/admin/page-visits-section.tsx` | Selector, cards, chart, top routes y estados. |
| `supabase/migrations/<timestamp>_page_visits.sql` | Tabla, índices, RLS, revocaciones y agregado SQL restringido. |

### Modificados

| Archivo | Cambio |
| --- | --- |
| `middleware.ts` | Matcher ampliado, predicate y schedule fire-and-forget después de construir la respuesta. |
| `lib/supabase/middleware.ts` | Callback opcional con el usuario ya validado, sin segundo `auth.getUser()`. |
| `app/admin/page.tsx` | Composición de `PageVisitsSection`, sin alterar guardia ni payment-orders. |
| Tipos Supabase generados, si el workflow del repositorio los mantiene | Registrar `page_visits` sin exponer el service client. |
| Tests de middleware, API, agregación, UI y DB | Cubrir contratos y regresiones descritos abajo. |

## 7. Pruebas

- **Predicate/middleware:** documento público/auth/admin aceptado; `/api`, `_next`, `static`, favicon, asset, RSC y prefetch omitidos; query eliminada; slash normalizado; bot case-insensitive omitido; UA ausente aceptado; test user omitido; admin aceptado; tarea programada después de la respuesta.
- **Privacidad/ingestión:** payload no contiene `user_agent`, IP, cookie, user ID ni query; HMAC conocido produce digest esperado; IP ausente usa bucket `anonymous`; secreto ausente no inserta; error de Supabase no produce unhandled rejection ni cambia la respuesta.
- **Agregación:** límites exactos UTC para 7/30/90 días, invalid range sin query, `COUNT DISTINCT` repetido dentro de un día, sumatoria de únicos diarios, ceros intermedios/rango vacío, top routes limitado y desempate de picos.
- **Ruta:** admin 200, no autenticado 401, no admin 403, error 400 sin invocar servicio, respuesta aggregate-only y `no-store` en todos los estados.
- **RLS/migración:** schema/índices presentes; anon y authenticated no pueden `SELECT`, `INSERT`, updatear ni borrar; service-role inserta y agrega; ningún row tiene columna/payload UA.
- **UI:** selector llama al range correcto; skeleton/error/empty no muestran filas crudas; cards, AreaChart y top routes reflejan el DTO; los flujos existentes de `/admin` y payment-orders permanecen intactos.

## 8. Rendimiento, privacidad y operación

El límite de +15 ms p95 se protege porque el critical path solo hace clasificación, normalización y registro de una Promise; no hace una escritura ni una segunda consulta de auth. El insert corre con `waitUntil` o fire-and-forget y tiene timeout acotado. Se medirán p95 de middleware, errores de ingestión, duración del RPC y crecimiento diario de filas, sin registrar valores de IP, secreto, cookies o UA.

No se establecen cookies ni localStorage, no se envía información a terceros y no se guarda IP cruda ni User-Agent. El HMAC diario limita la correlación entre fechas; la rotación de `PAGE_VISITS_HMAC_SECRET` invalida correlación futura. El secreto debe configurarse server-side en cada entorno, rotarse de forma controlada y nunca entrar en logs. La retención se definirá antes de escalar y borrará por `visit_date`; el diseño es GDPR-friendly por minimización, finalidad acotada y ausencia de identificadores persistentes de navegador.

## 9. Rollout y rollback

1. Aplicar la migración en staging y verificar privilegios, RLS, RPC, índices y que estén configurados `PAGE_VISITS_HMAC_SECRET` y `SUPABASE_SERVICE_ROLE_KEY`.
2. Desplegar middleware con un kill switch de configuración (`PAGE_VISITS_ENABLED`, default seguro según el rollout) y validar páginas, bots, test users, admins y ausencia de PII.
3. Habilitar la sección y API admin; empezar en 30d, sabiendo que no existe backfill.
4. Observar p95, fallos asíncronos, latencia de agregados y retención. Si el volumen requiere particiones físicas, hacer un cambio separado.
5. Para rollback, apagar primero el kill switch o retirar el schedule; navegación y sesión siguen funcionando. La API/UI puede retirarse independientemente. La tabla se conserva para retención controlada salvo decisión explícita de borrar datos.

## Key Learnings

1. La frontera correcta es el middleware, pero la persistencia debe ejecutarse exclusivamente con service role y fuera del critical path.
2. El contrato de privacidad mínimo es pathname normalizado, timestamp UTC, `ip_hash` HMAC diario y country derivado opcional; `user_agent` crudo, IP, cookies y user IDs quedan fuera.
3. Los admins cuentan por definición de cobertura completa; los test users se excluyen usando la sesión ya validada, sin guardar identidad.
4. La agregación SQL con días UTC materializados y límites estrictos evita transferir eventos y permite ceros, picos y top-routes de forma bounded.
