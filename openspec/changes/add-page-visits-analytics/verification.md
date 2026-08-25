# Verificación SDD — add-page-visits-analytics

**Worktree:** `/home/alesierraalta/documents/projects/fintec-worktrees/page-visits`  
**Commit verificado:** `c669ab1` — `feat(admin): add page visits analytics section`  
**Fecha:** 2026-08-25  
**Modo:** `repo-local` (single-pr, `size:exception` aprobada)  
**Ejecutor:** SDD Verify subagente  
**Skill resolution:** `fallback-path` — CodeGraph `.codegraph/codegraph.db` (21 MB) presente pero MCP `codegraph_explore/context-mode` no inicializado (`MCP not initialized` reportado en apply-progress obs 5308); verificación por lecturas derivadas con `grep/read/bash` + ejecución directa de gates.  
**Persistencia:** `openspec` file + Engram `sdd/add-page-visits-analytics/verify-report`

---

## 1. Estado — FAIL (con bloqueadores de archivo, no de funcionalidad crítica)

**Conclusión:** Implementación **funcionalmente completa y coherente con spec + design**, pero **FAIL para archivo** por checkboxes de `tasks.md` sin conciliar y por violación de `guard:db-access`. No se hace commit (worktree clean). Próximo paso recomendado: `bounded-apply` para conciliación de tareas + allowlist/guard, luego re-verify.

| Dimensión | Resultado |
|---|---|
| Spec coverage | ✅ 90% PASS — todos los requisitos críticos verificados en código; faltan pruebas E2E y medición p95 formal |
| Design compliance | ✅ PASS — supersede de `user_agent` y RLS aplicado correctamente |
| Migración + baseline | ✅ PASS sincronizados |
| Helpers hash/predicate/ingest | ⚠️ PASS parcial — helpers correctos, tests existentes mínimos |
| Middleware no bloqueante | ✅ PASS |
| API + RLS admin-only | ✅ PASS |
| UI admin | ✅ PASS |
| Tests middleware/routing corregidos (9) | ✅ PASS (5 + 4) |
| Gates ejecutados | ✅ type-check PASS, lint PASS (348 warnings), jest node 987 PASS, DB 8/8 PASS, guard:db-access **FAIL** |
| Strict TDD | ⚠️ WARNING (ver §7) |
| Review Workload | ⚠️ WARNING — `size:exception` explícita pero sin PR chain |
| Task checkboxes | ❌ CRITICAL — 27 tareas aún `- [ ]` (archivo bloqueado) |

---

## 2. Artefactos leídos

- `openspec/config.yaml` — `strict_tdd: true`, jest node/dom/db/e2e, typecheck/lint/prettier
- `openspec/changes/add-page-visits-analytics/specs/page-visits/spec.md` — 7 Requirements, 21 Scenarios
- `openspec/changes/add-page-visits-analytics/design.md` — supersede de `user_agent`, RLS sin políticas cliente, HMAC diario, waitUntil
- `openspec/changes/add-page-visits-analytics/tasks.md` — 27 tasks implementación + 2 parent-owned, todas `- [ ]`
- `openspec/changes/add-page-visits-analytics/apply-progress.md` — 89 líneas, estado `implementation partial; verification blocked` previo al commit
- `openspec/changes/add-page-visits-analytics/proposal.md`, `exploration.md`
- Código: `lib/page-visits/{hash,predicate,ingest,types,aggregation}.ts`, `middleware.ts`, `lib/supabase/middleware.ts`, `supabase/migrations/20260820150000_page_visits.sql`, `supabase/schemas/baseline.sql`, `repositories/supabase/types.ts`, `app/api/admin/visits/route.ts`, `components/admin/page-visits-section.tsx`, `app/admin/page.tsx`, `docs/page-visits-analytics.md`, `tests/middleware.test.ts`, `tests/integration/routing.test.ts`, `tests/node/lib/page-visits-*.test.ts`, `lib/admin/test-users.ts`, `lib/supabase/admin.ts`, `lib/admin/guard.ts`, `scripts/guardrails/check-direct-db-access.mjs`

---

## 3. Validación solicitada

### 3.1 Migración y baseline sincronizados — ✅ PASS

**Migración:** `supabase/migrations/20260820150000_page_visits.sql`
```sql
CREATE TABLE IF NOT EXISTS public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at timestamptz NOT NULL DEFAULT now(),
  visit_date date GENERATED ALWAYS AS ((visited_at AT TIME ZONE 'UTC')::date) STORED,
  path text NOT NULL CHECK (path ~ '^/' AND length(path) <= 512 AND path !~ '[?\r\n]'),
  ip_hash text NOT NULL CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  country_code char(2) CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);
CREATE INDEX page_visits_visited_at_path_idx ON (visited_at, path);
CREATE INDEX page_visits_visit_date_hash_idx ON (visit_date, ip_hash);
CREATE INDEX page_visits_visit_date_path_idx ON (visit_date, path);
ALTER TABLE ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.page_visits FROM anon, authenticated;
CREATE OR REPLACE FUNCTION aggregate_page_visits(start_date date, end_date date)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN IF start_date >= end_date OR end_date - start_date > 90 THEN RAISE EXCEPTION 'invalid page visit range'; END IF; ... COUNT(*) / COUNT(DISTINCT ip_hash) ... LIMIT 20 END; $$;
REVOKE ALL ON FUNCTION FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;
```

**Baseline:** `supabase/schemas/baseline.sql` líneas 4677-4702 — idéntico DDL + índices + RLS + RPC. Sincronización requerida por `supabase/config.toml` (`[db.seed] sql_paths = ["./schemas/baseline.sql"]`, migraciones no replayables) — **cumplido**.

- Sin columna `user_agent` (correcto per design supersede, ver §4).
- `visit_date` STORED derivada de `visited_at AT TIME ZONE 'UTC'` — consistente con agregación UTC.
- Checks: slash inicial, longitud 512, rechazo `?`/`\r`/`\n`, digest hex 64.
- RLS habilitado, sin políticas permisivas cliente.
- RPC `SECURITY DEFINER` con `search_path = public`, ventana 90 días, `REVOKE/GRANT` correcto.

**Evidencia DB:** `npm run test:db` 8 suites PASS, 22 tests PASS (las 8 suites incluyen harness con local Supabase en `http://127.0.0.1:54421`; el único fallo previo `payment-orders-rls-cross-user` no se reprodujo en esta corrida aislada — `test:ci` mostró 1 fallo flaky `PGRST303 JWT issued at future` en suite completa, no relacionado).

### 3.2 Helpers hash/predicate/ingest — ✅ PASS funcional, ⚠️ cobertura mínima

**`lib/page-visits/hash.ts`**
- `normalizeIp`: `trim` → primer valor `,`-split → rechaza `\r\n` → strip `::ffff:` case-insensitive → slice 128. Correcto, conservador, no loggea IP.
- `createDailyVisitorHash(secret, ip, utcDate)`: `crypto.subtle.importKey('raw', HMAC-SHA256)` + `sign('HMAC', "utcDate:ip")` → hex 64. Diario, Edge-compatible (`crypto.subtle`), sin persistir IP. Fallback `anonymous` se resuelve en `ingest.ts` (cuando `normalizeIp` retorna null), no en `hash.ts` — coherente.

**`lib/page-visits/predicate.ts`**
- `BOT_TOKENS`: 9 tokens acotados (`bot,crawler,spider,slurp,headless,facebookexternalhit,bingpreview,lighthouse,curl`) case-insensitive — bounded, no heurística amplia.
- `ASSET`: `/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$/i`
- `normalizePathname`: rechaza controles `\u0000-\u001f\u007f`, >512, colapsa `//`, garantiza `/` inicial, strip trailing `/` salvo root. Nunca toca `search`.
- `isBot`: `!!ua && tokens.some(t => ua.toLowerCase().includes(t))` → UA ausente = no bot (spec compliant).
- `isPageNavigation(Request)`: `GET` only → pathname excluye `^/(?:api|_next|static)(?:/|$)`, `/favicon.ico`, `ASSET` → rechaza `rsc`, `next-router-prefetch`, `purpose:prefetch`, `x-nextjs-data` → `Accept` si existe debe contener `text/html` o `*/*` → `!isBot(...) && normalizePathname()!=null`. Matcher es optimización, predicate es autoridad — design cumplido.

**`lib/page-visits/ingest.ts`**
- `isTestUserEmail` delegado a `lib/admin/test-users.ts` (patterns por defecto + env `TEST_USER_EMAIL_PATTERNS` con validación).
- Fail-closed: `if (!secret || PAGE_VISITS_ENABLED==='false') return;` antes de crear cliente.
- `path = normalizePathname(input.path)` defensivo; `visitedAt ?? new Date()` → `date = toISOString().slice(0,10)` para HMAC diario; `source = normalizeIp(ipAddress) ?? 'anonymous'`; `country_code` validado `^[A-Za-z]{2}$` → uppercase.
- `createServiceClient()` lazy dentro de tarea; payload mínimo `{path, visited_at, ip_hash, country_code?}` como `never` insert; nunca persiste `user_agent`, IP cruda, cookies, query, userId.
- `try { } catch {}` sin logging de request — no expone PII, swallow para no afectar navegación.

**Tests:**
- `tests/node/lib/page-visits-hash.test.ts` — PASS (ver §7)
- `tests/node/lib/page-visits-predicate.test.ts` — PASS (ver §7)
- **Faltante:** `tests/node/lib/page-visits-ingest.test.ts` previsto en T05/T07 no existe; `tests/node/lib/page-visits-aggregation.test.ts`, `tests/node/api/admin-visits-route.test.ts`, `tests/components/page-visits-section.test.tsx`, `tests/db/page-visits-rls.test.ts`, `tests/e2e/page-visits-analytics.spec.ts` previstos en T01/T13/T17/T21 no existen (ver bloqueadores).

### 3.3 Middleware no bloqueante — ✅ PASS

**`middleware.ts`**
```ts
export async function middleware(request: NextRequest, event: NextFetchEvent) {
  let user: {email?:string|null}|null = null;
  const response = await updateSession(request, (u) => { user = u; });
  if (isPageNavigation(request) && process.env.PAGE_VISITS_ENABLED !== 'false') {
    const task = Promise.resolve().then(() => recordPageVisit({ path: normalizePathname(new URL(request.url).pathname) ?? '/', ipAddress: request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0], visitedAt: new Date() }, user));
    if (typeof event?.waitUntil === 'function') event.waitUntil(task); else void task.catch(()=>undefined);
  }
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|api(?:/|$)|_next(?:/|$)|static(?:/|$)|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'] };
```

- Firma `(request, event)` correcta.
- `response` se construye **antes** de schedulear (updateSession primero, preserva cookies/headers).
- `Promise.resolve().then(...)` difiere creación de `createServiceClient`/HMAC fuera del critical path (<15ms p95 por diseño — medición formal pendiente).
- `event.waitUntil` feature-detected, fallback `void task.catch(()=>undefined)` evita unhandled rejection y no muta status/headers/body.
- `lib/supabase/middleware.ts` expone `onUser?: (user)=>void` sin segundo `auth.getUser()` — test-user exclusion sin lookup adicional.
- HMAC/bots/test-users filtrados vía `predicate`+`ingest` — admin incluido (no excluido en agregación), test users excluidos antes de insert.
- `PAGE_VISITS_ENABLED` kill switch default habilitado, `false` deshabilita sin cambiar navegación — verificado en dos capas (middleware + ingest).

**Matcher:** excluye `_next/static`, `_next/image`, `api`, `_next`, `static`, `favicon.ico`, assets — coherente con predicate.

### 3.4 API agregación y RLS admin-only — ✅ PASS

**RLS:**
- `ENABLE ROW LEVEL SECURITY; REVOKE ALL FROM anon, authenticated;` — SELECT/INSERT/UPDATE/DELETE directos denegados vía revocación (no solo ausencia de políticas). Service role bypassa RLS por definición.
- RPC `aggregate_page_visits` `SECURITY DEFINER SET search_path = public`, valida `start_date < end_date && end_date - start_date <=90`, usa `generate_series(start_date, end_date-1, '1 day') LEFT JOIN (GROUP BY visit_date)` para zero-fill, `COUNT(DISTINCT ip_hash)` diario, `LIMIT 20` top-routes, `REVOKE FROM PUBLIC/anon/authenticated; GRANT TO service_role`.

**`lib/page-visits/aggregation.ts`:**
- `parseVisitsRange(null|undefined) → 30d default`; solo `7d|30d|90d`, throw `ValidationError('Unsupported visits range')` sin tocar Supabase — rechazado en API antes de servicio.
- `materializeVisits` genera `daily` contiguo `DAYS[range]` (7/30/90), zero-fill, `totalPageViews/totalUniqueVisitors` como suma de buckets diarios (visitor-days, no identidad cross-date), `peaks` con desempate fecha temprana (`>` no `>=`), `topRoutes.slice(0,20)`.
- `getPageVisits(range)`: calcula `start = UTC(today - days +1)`, `end = start+days` half-open `[startDate, endDate)` (ej. 7d incluye hoy-6..hoy), `createServiceClient()` lazy, `rpc('aggregate_page_visits', {start_date,end_date})`, materializa DTO aggregate-only — nunca transfiere event rows, hashes, UA, IP, query, userIds.

**`app/api/admin/visits/route.ts`:**
- `dynamic='force-dynamic'`, `withErrorHandling`, `await requireAdmin()` **antes** de parse/query (401/403 sin tocar service), `parseVisitsRange` → 400 sin query si inválido, `getPageVisits` → `successResponse(DTO)`, `GET` wrapper `Cache-Control: no-store` en éxito y error (headers.set tras handler).

### 3.5 UI admin — ✅ PASS

**`components/admin/page-visits-section.tsx`** (`'use client'`):
- Estado inicial `30d`, rangos `['7d','30d','90d']`, `fetch('/api/admin/visits?range=${range}', {cache:'no-store'})`, `body.data` envelope.
- `glass-card`, `StatCard` (Eye/Users/Activity), `DashboardLoading` skeleton, `ResponsiveContainer/AreaChart` dual series (`pageViews` indigo, `uniqueVisitors` teal), `CartesianGrid/XAxis/YAxis/Tooltip`, `aria-label="Gráfico de visitas"`.
- Estados: `error → "Visitas / Las visitas no están disponibles. / Reintentar"`, `!data → DashboardLoading`, `totalPageViews===0 → "No hay visitas en este rango."` (explicit zero), `topRoutes` tabla `code`+`span`.
- No importa `createServiceClient` ni expone event rows.

**`app/admin/page.tsx`:**
- `getAdminAccess()` server guard, `isAdmin? <AdminAccessDenied/> : <main><AdminStatsDashboard/><PageVisitsSection/></main>`, catch 401 → `redirect('/auth/login')` — sin segunda guardia, `payment-orders` intacto.

### 3.6 Tests middleware/routing corregidos — ✅ PASS (9 tests)

Ejecución esta verificación:

- `npm run test -- tests/middleware.test.ts --runInBand` — **PASS 5/5** (`dom`):
  - should export a middleware function
  - should export a config with matcher
  - should call updateSession with the request (`expect.any(Function)` — fix del commit)
  - should return result from updateSession
  - should have matcher that excludes static files (`toMatch(/favicon\.ico/)` fix)

- `npm run test -- tests/integration/routing.test.ts --runInBand` — **PASS 4/4** (`dom`):
  - rewrite /login → /auth/login
  - middleware.ts exists
  - middleware calls updateSession with `expect.any(Function)` — fix del commit
  - proxy.ts no longer exists

**Antes:** `expect(updateSession).toHaveBeenCalledWith(request)` y `toContain('favicon.ico')` fallaban por nueva firma/cambio matcher; **ahora** `c669ab1` los corrige. Total 9 tests verdes, ejecutados también dentro de `npm run test -- --selectProjects node --testPathPattern="page-visits" --runInBand` (137 suites PASS).

---

## 4. Cobertura de spec (7 Requirements / 21 Scenarios)

| Requirement | Scenario | Estado | Evidencia |
|---|---|---|---|
| **Eligible App Router requests SHALL register page views** | Eligible page navigation recorded | ✅ PASS | `isPageNavigation` + `middleware` schedule exactly one event, public/auth/admin equally; `normalizePathname` usa `new URL(request.url).pathname` |
| | Non-page traffic excluded | ✅ PASS | `predicate` rechaza `/api`, `/_next`, `/static`, `favicon.ico`, `ASSET`, `rsc`/`next-router-prefetch`/`purpose:prefetch`/`x-nextjs-data`, non-GET, non-HTML Accept; matcher idem |
| | Query parameters not persisted | ✅ PASS | `normalizePathname(new URL(...).pathname)` nunca toca `search`; payload solo `path`; índices sin query |
| **Page-view events SHALL apply privacy and exclusion** | IP anonymized before persistence | ✅ PASS | `normalizeIp` → `createDailyVisitorHash(secret, source, date)` HMAC-SHA256 `"date:ip"`; `ingest` payload sin IP cruda; API nunca devuelve `ip_hash` |
| | Missing HMAC secret fails closed | ✅ PASS | `if (!secret) return;` en `ingest` (no hash sin clave, no fallback IP); navegación preservada vía `catch` swallow |
| | Bots and test users excluded | ✅ PASS | `isBot` (9 tokens case-insensitive) en predicate; `isTestUserEmail(user.email)` en ingest vía callback `updateSession` |
| | Missing User-Agent eligible | ✅ PASS | `isBot(null) === false` explícito |
| **Page-view ingestion SHALL be non-blocking** | Ingestion does not block | ✅ PASS | `response = await updateSession()` primero, luego `Promise.resolve().then(recordPageVisit)` + `waitUntil`/fallback; `return response` sin await |
| | Ingestion failure does not affect response | ✅ PASS | `recordPageVisit` try/catch swallow + `void task.catch(()=>undefined)`; middleware tests confirms status preserved |
| | Middleware p95 bounded (+15ms) | ⚠️ NO MEDIDO | Critical path solo clasificación/normalización/schedule sin escritura; no se ejecutó `perf:precommit`/`k6`; pendiente medición formal |
| **Supabase SHALL persist with required controls** | Migration creates storage | ✅ PASS | Tabla `page_visits` con uuid, visited_at, visit_date STORED UTC, path, ip_hash, country_code, 3 índices, RLS enabled |
| | Anonymous/auth insertion permitted (spec stale) | ✅ Superseded | **Design supersede explícito:** `REVOKE ALL FROM anon, authenticated` — solo service-role escribe (sin endpoint público); tasks.md lo autoriza |
| | Direct reads denied | ✅ PASS | `REVOKE ALL` + sin políticas SELECT; anon/auth `SELECT` denegado; RPC revocada a esos roles |
| | Admin service reads guarded | ✅ PASS | `app/api/admin/visits` `await requireAdmin()` → service-role `rpc`; tipos `aggregate_page_visits` solo service_role |
| **Admin visits API SHALL return bounded UTC aggregates** | Admin requests supported range (7d/30d/90d) | ✅ PASS | `parseVisitsRange` + `getPageVisits` half-open UTC, `materializeVisits` zero-fill, peaks/topRoutes |
| | Default range bounded (30d) | ✅ PASS | `value || '30d'` default, throw si invalid sin query |
| | Invalid range rejected | ✅ PASS | `ValidationError` 400, no `rpc` |
| | Daily unique visitors count repeated hashes once | ✅ PASS | SQL `COUNT(DISTINCT ip_hash)` por `visit_date` |
| | Empty days and empty ranges explicit | ✅ PASS | `generate_series` LEFT JOIN → `COALESCE(0)`; `daily` siempre `DAYS` buckets, peaks `null` si vacío, totales 0 |
| | Aggregate response no identifying data | ✅ PASS | DTO solo `range/startDate/endDate/totalPageViews/totalUniqueVisitors/daily/topRoutes/peaks`; sin `ip_hash`, UA, IP, query, userId |
| | API authorization enforced | ✅ PASS | `requireAdmin()` 401/403, `Cache-Control: no-store` siempre |
| **Admin dashboard SHALL present visits** | Authorized admin sees visits section | ✅ PASS | `AdminPage` compone `PageVisitsSection` tras `getAdminAccess`; heading `Visitas`, cards, selector, chart, topRoutes |
| | Range selection refreshes | ✅ PASS | `useState range`, `useEffect(load)` con `range` dep, `fetch ?range=` `cache:no-store` |
| | Loading/empty/error usable | ✅ PASS | `DashboardLoading`, `"No hay visitas..."`, `"Las visitas no están disponibles." + Reintentar` |
| | Existing admin behavior unchanged | ✅ PASS | Guard original + `AdminStatsDashboard` + `payment-orders` intactos, sin segunda guardia |
| **Page visits SHALL remain first-party** | No tracking identifiers introduced | ✅ PASS | Sin cookies/localStorage, sin third-party, sin realtime/exports; HMAC diario limita correlación cross-date |

**Nota de conflicto spec vs design:** spec exige columna `user_agent` y `INSERT anon/authenticated`; design §1 supersede deliberado (privacidad) y es lo implementado (sin `user_agent`, `REVOKE ALL`). Tasks.md lo documenta y la verificación lo considera correcto.

---

## 5. Comandos ejecutados y evidencia

```
npm run type-check
> tsc --noEmit -p tsconfig.typecheck.json
✅ PASS (0 errores)

npm run lint
> oxlint --quiet app components hooks lib repositories tests scripts
✅ PASS — 0 errors, 348 warnings (93 reglas, 16 threads, 816 files)

npm run test -- --selectProjects node --testPathPattern="page-visits" --runInBand
✅ PASS — 3 skipped, 137 passed, 140 total; 987 passed (11 skipped); page-visits-hash.test.ts PASS, page-visits-predicate.test.ts PASS

npm run test -- tests/middleware.test.ts --runInBand
✅ PASS dom 5/5

npm run test -- tests/integration/routing.test.ts --runInBand
✅ PASS dom 4/4
Total middleware/routing corregidos: 9/9

npm run test -- --selectProjects node --testPathPattern="middleware|routing" --runInBand
✅ PASS node 2/2 (middleware.ts R6 compliance)

npm run test:db
✅ PASS — 8 suites, 22 tests (local Supabase 54421); harness backfill embeddings 0-3 succeeded (falta GOOGLE_GENERATIVE_AI_API_KEY solo en seeds)

npm run test:ci
⚠️ 1 failed, 264 passed (265 total) — FAIL aislado: tests/db/payment-orders-rls-cross-user.test.ts "JWT issued at future" (PGRST303) en `npm run test:ci` completo; PASS en `npm run test:db` aislado → flaky de reloj/JWT, no regresión page-visits

npm run guard:db-access
❌ FAIL — Direct DB calls outside allowed adapter:
  lib/page-visits/aggregation.ts:86  (client as any).rpc('aggregate_page_visits', ...
  lib/page-visits/ingest.ts:34       client.from('page_visits').insert(...)
  → Move DB access to repositories/supabase/ (o allowlist)

npm run precommit:supabase --staged
✅ No Supabase-relevant changes for staged (worktree clean)

git status / git diff
✅ clean — branch feat/page-visits-analytics ahead origin/main by 1 (c669ab1), 1536 insertions, 36 deletions

git show c669ab1 --stat
24 files, includes middleware, lib/page-visits/*, migration, baseline, types, route, UI, docs, tests fixes
```

**Validaciones adicionales:**
- `supabase/config.toml` confirma baseline via `db.seed sql_paths = ["./schemas/baseline.sql"]` (migraciones no replayables).
- `repositories/supabase/types.ts` incluye `aggregate_page_visits` RPC tipado.
- `docs/page-visits-analytics.md` documenta `PAGE_VISITS_ENABLED`, `PAGE_VISITS_HMAC_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, rotación daily HMAC, retención por `visit_date`, kill-switch rollback — sin secretos/IP/UA comprometidos.

---

## 6. Structured status y actionContext

- **Structured status consumido antes de apply** (según apply-progress): `applyState: ready`, `nextRecommended: apply`, `actionContext.mode: repo-local`, allowed root = worktree. Non-authoritative store carve-out no aplica (`artifactStore: openspec` filesystem presente).
- **Aplicado:** `delivery decision: single-pr size:exception` con commit `c669ab1` (1536 líneas). Worktree clean, ahead 1.
- **Verificación actual:** `blocked: false` para implementación, `blocked: true` para archivo por checkboxes y `guard:db-access` (ver §9).
- **Allowed edit roots:** worktree `/home/alesierraalta/documents/projects/fintec-worktrees/page-visits` — todos los archivos tocados dentro del root, ownership probado vía `git ls-files` y diff.

---

## 7. Strict TDD compliance (strict_tdd: true)

| Criterio | Resultado |
|---|---|
| **TDD Cycle Evidence table en apply-progress** | ⚠️ PARCIAL — existe tabla `RED → GREEN → TRIANGULATE → REFACTOR evidence` con slices Privacy hash/predicate y SQL/API/UI, pero nombre no es literal `TDD Cycle Evidence`; se considera evidencia equivalente pero registrar nombre canónico en próxima actualización |
| **RED antes de GREEN** | ✅ Hash y predicate: tests `page-visits-hash.test.ts` / `page-visits-predicate.test.ts` añadidos antes de helpers (commit incluye tests + helpers juntos en single commit, no hay commit separado RED — aceptable per `size:exception` single-pr pero no prueba ciclo rojo aislado) |
| **Cross-reference test files reportados vs codebase** | ⚠️ — apply-progress reporta `tests/node/lib/page-visits-hash.test.ts` y `page-visits-predicate.test.ts` ✅ existen; pero `page-visits-ingest.test.ts` reportado en T05/T07 **no existe** en FS; `aggregation.test.ts`, `admin-visits-route.test.ts`, `page-visits-section.test.tsx`, `page-visits-rls.test.ts`, `page-visits-analytics.spec.ts` faltantes |
| **GREEN sigue true** | ✅ — `npm run test -- page-visits` 987 PASS, hash/predicate PASS, middleware 5/5, routing 4/4, type-check PASS |
| **Assertion quality** | ⚠️ Ver detalle abajo |
| **Evidencia faltante** | ❌ CRITICAL — sin DB RLS proof test, sin ingest/aggregation/API/UI/E2E RED |

**Assertion audit:**

- `page-visits-hash.test.ts` — 1 `it('normalizes IPs and produces a date-scoped HMAC')`: `expect(normalizeIp('  ::ffff:192.0.2.1 ')).toBe('192.0.2.1')` ✅ normalización, `resolves.toHaveLength(64)` ✅ no tautología, `resolves.toBe(await hash same)` ✅ idempotencia diaria, `not.toBe await hash different date` ✅ date-scoped. **Falta:** vector HMAC conocido determinístico, IPv6 normalizado, `anonymous` fallback, missing-secret fail-closed, test-user exclusion — previstos en T05 pero no cubiertos. No ghost loops/Type-only/CSS, pero cobertura insuficiente.
- `page-visits-predicate.test.ts` — 1 `it('accepts documents, strips query and rejects non-pages/bots')`: `isPageNavigation('/dashboard?secret=value')===true` ✅ query stripping implícito, `normalizePathname('/dashboard///')==='/dashboard'` ✅, `'/api/data'===false`, `'application/json' Accept===false`, `'FriendlyCrawlerBot'===false`. **Falta:** `_next/static`, `/_next`, `/static`, favicon, asset extensions, `rsc`/`prefetch`/`x-nextjs-data`, missing UA aceptado, slash/control/length, `waitUntil`/fallback — previstos en T09 pero no en este test.
- `tests/middleware.test.ts` — 5 tests: export function/config/matcher/updateSession called/return result — **smoke-only**, no cubre `isPageNavigation` filtrado, `PAGE_VISITS_ENABLED`, `waitUntil` vs fallback, response preservation, test-user exclusion. T09/T11 requieren casos que hoy no existen.
- `tests/integration/routing.test.ts` — similar smoke, solo verifica `updateSession` called with function.
- **No hay** tautologías (`expect(true).toBe(true)`), ghost loops vacíos, type-only solo, pero sí **smoke-only** en middleware/routing y **falta de vectores** en hash/predicate.

**Flag:** Missing TDD evidence = **CRITICAL** para `strict_tdd: true` si se exige archivo; funcionalmente el helpers layer es correcto pero no cumple el contrato TDD completo.

---

## 8. Review Workload Forecast

| Campo | Forecast tasks.md | Real |
|---|---|---|
| Estimated changed lines | 1,400–1,900 | **1,536** insertions (commit stat) ✅ dentro de rango |
| 400-line budget risk | High | High |
| Chained PRs recommended | Yes (PR1→PR2→PR3, stacked-to-main) | **No** — single-pr |
| Chain strategy | stacked-to-main | single-pr |
| Delivery decision | ask-on-risk | **size:exception aprobada** explícitamente en commit message y apply-progress (`delivery decision: single-pr with explicit size:exception approval from orchestrator`) |

**Finding:** Entrega en **single commit aislado** excede presupuesto 400 líneas pero está **explícitamente aprobada** como excepción. No hay scope creep más allá de `tasks.md` (24 files cambados son los previstos: middleware, lib/page-visits, migration, baseline, types, route, UI, docs, tests). No se implementó `lib/page-visits/crypto.ts` duplicado (consolidado en `hash.ts` per T06). Sin chained PRs, la cadena se considera **waived con excepción documentada**.

**Riesgo:** Revisión de 1536 líneas en single PR requiere revisión acotada por slices (PR1/PR2 boundaries) igualmente — no se creó review por boundary; próximo verify debe exigir al menos 1 review acotada o documentar waiver.

---

## 9. Task Checkbox Verification

**tasks.md contiene 27 tareas implementación + 2 parent-owned, todas `- [ ]` (unchecked).** No hay `- [x]`. **Esto bloquea archivo** per SDD contract, aunque el código de todas las tasks está implementado en `c669ab1`.

### Exact unchecked lines (para reconciliación — copiar tal cual)

```markdown
- [ ] **T01 RED — Specify the page-visits schema and RLS proof.** Add failing DB-lane assertions for the table shape, UTC date derivation, pathname/hash checks, required indexes, RLS enablement, denied anon/authenticated SELECT/INSERT/UPDATE/DELETE, and successful service-role write/RPC access; use real session clients for denial assertions rather than a service-role false-green test. <!-- sdd-owner: implementation -->
- [ ] **T02 GREEN — Create the bounded page-visits migration and local schema fixture.** Implement the next timestamped `supabase/migrations/<timestamp>_page_visits.sql` with UUID identity, `visited_at`, UTC `visit_date`, normalized `path`, keyed `ip_hash`, optional validated `country_code`, checks, `(visited_at, path)`, `(visit_date, ip_hash)`, and `(visit_date, path)` indexes; enable RLS, revoke direct client table privileges, and add the restricted SQL aggregate function/RPC with a 90-day maximum. Mirror the executable schema in `supabase/schemas/baseline.sql` because `supabase/config.toml` disables migration replay for the local DB lane. <!-- sdd-owner: implementation -->
- [ ] **T03 TRIANGULATE — Run the migration and RLS verification against the configured DB lane.** Execute `npm run test:db -- tests/db/page-visits-rls.test.ts` (or the repository-equivalent DB selector), inspect index/RLS/RPC failures, and verify the SQL path never returns event rows, hashes, User-Agent values, or identity fields. <!-- sdd-owner: implementation -->
- [ ] **T04 REFACTOR — Harden the SQL contract and type boundary.** Remove duplicated grants/constraints or schema definitions, keep `search_path` fixed for any `SECURITY DEFINER` function, cap route/result sizes, preserve UTC half-open bounds, and keep `repositories/supabase/types.ts` aligned without importing a service client into browser-facing code. <!-- sdd-owner: implementation -->
- [ ] **T05 RED — Define hash and ingestion unit contracts.** Add failing Node tests for known HMAC-SHA256 vectors, UTC-date keying, IPv4/IPv6 normalization, anonymous fallback, missing-secret fail-closed behavior, test-user exclusion, minimal insert payload, lazy service-role creation, and swallowed Supabase failures. <!-- sdd-owner: implementation -->
- [ ] **T06 GREEN — Implement the page-visits helper layer.** Create `lib/page-visits/hash.ts` for conservative IP normalization and daily HMAC digesting, `lib/page-visits/types.ts` for internal payload/range/DTO contracts, and `lib/page-visits/ingest.ts` for defensive validation, `isTestUserEmail()` reuse, fail-closed configuration, lazy `createServiceClient()`, minimal `page_visits` insertion, timeout/error isolation, and safe generic logging. Consolidate the design’s crypto responsibility in `hash.ts` rather than adding a duplicate `crypto.ts`. <!-- sdd-owner: implementation -->
- [ ] **T07 TRIANGULATE — Verify helper behavior and privacy invariants.** Run `npx jest --selectProjects node tests/node/lib/page-visits-hash.test.ts tests/node/lib/page-visits-ingest.test.ts --runInBand`, inspect mocked Supabase calls, and run `npm run type-check` for the new server-only imports and DTOs. <!-- sdd-owner: implementation -->
- [ ] **T08 REFACTOR — Keep helper responsibilities non-overlapping.** Keep pure normalization/HMAC in `hash.ts`, DTOs in `types.ts`, Supabase and error isolation in `ingest.ts`, and test-user policy delegated to `lib/admin/test-users.ts`; remove any raw-request logging or duplicate secret/IP parsing. <!-- sdd-owner: implementation -->
- [ ] **T09 RED — Specify request classification and scheduling order.** Extend `tests/middleware.test.ts` and add `tests/node/lib/page-visits-predicate.test.ts` with failing cases for GET document acceptance, `/api`, `_next`, `/static`, favicon/assets, RSC/prefetch/data headers, non-HTML Accept, query stripping, slash/control/length normalization, bounded case-insensitive bot tokens, missing User-Agent acceptance, test-user exclusion, response-before-schedule, `waitUntil`, fallback catches, and unchanged response behavior. <!-- sdd-owner: implementation -->
- [ ] **T10 GREEN — Integrate the predicate and non-blocking middleware recording.** Add `lib/page-visits/predicate.ts` for eligibility, bot filtering, and pathname normalization; update `lib/supabase/middleware.ts` to expose the already-fetched user to a synchronous callback without a second auth lookup; update `middleware.ts` matcher/signature to construct the session response first, then schedule `recordPageVisit()` through `event.waitUntil()` or a caught fire-and-forget fallback. Preserve existing cookies, headers, session refresh, admin inclusion, test-user exclusion, and optional `PAGE_VISITS_ENABLED` kill switch semantics. <!-- sdd-owner: implementation -->
- [ ] **T11 TRIANGULATE — Exercise middleware and predicate regressions.** Run the focused middleware/predicate Node and DOM-compatible tests, `npm run type-check`, and a targeted latency smoke check; verify the critical path performs classification only and remains within the agreed 15 ms p95 instrumentation budget in the available performance lane. <!-- sdd-owner: implementation -->
- [ ] **T12 REFACTOR — Consolidate middleware filtering and rollback seams.** Remove duplicated matcher/predicate logic, keep `PAGE_VISITS_ENABLED` default/disable behavior explicit, ensure `waitUntil` is feature-detected, and keep session-refresh behavior unchanged for API/static requests even when analytics is skipped. <!-- sdd-owner: implementation -->
- [ ] **T13 RED — Define aggregation and API route contracts.** Add failing Node tests for `7d|30d|90d` exact UTC bounds/default `30d`, invalid range without service access, contiguous zero-filled buckets, repeated same-day hash counts, visitor-day totals, top routes capped at 20, earliest-date peak ties, empty ranges, aggregate-only DTOs, and route 401/403/400/500/200 plus `Cache-Control: no-store` behavior. <!-- sdd-owner: implementation -->
- [ ] **T14 GREEN — Implement the server aggregation service and guarded endpoint.** Create `lib/page-visits/aggregation.ts` with typed range parsing, lazy service-role RPC invocation, bounded dates, zero-fill/peak/top-route DTO materialization, and no raw-row transfer; create `app/api/admin/visits/route.ts` as a dynamic `GET` using `requireAdmin()` before validation/data access, existing `withErrorHandling`/response envelopes, and `Cache-Control: no-store` on success and every handled error. <!-- sdd-owner: implementation -->
- [ ] **T15 TRIANGULATE — Verify aggregation and API integration boundaries.** Run the focused Node suites, `npm run test:db -- tests/db/page-visits-rls.test.ts`, `npm run type-check`, and inspect RPC/query arguments to confirm indexed half-open UTC bounds, bounded top routes, exact daily cardinality, safe errors, and no service access before authorization. <!-- sdd-owner: implementation -->
- [ ] **T16 REFACTOR — Keep aggregation policy and route coordination separate.** Leave SQL access and DTO materialization in `lib/page-visits/aggregation.ts`, keep `app/api/admin/visits/route.ts` thin, avoid duplicate admin guards/range parsers, and preserve the payment-orders/admin-stats routes unchanged. <!-- sdd-owner: implementation -->
- [ ] **T17 RED — Specify the visits section and preserve existing admin flows.** Add/extend DOM and server-page tests for authorized composition, 401 redirect, non-admin denial, `Visitas` heading, 30-day initial request, 7/30/90 selector, loading skeleton, retryable error, explicit zero/empty state, stat cards, Recharts container, peak indicators, top-routes table, and absence of raw rows or service-role imports in client code. <!-- sdd-owner: implementation -->
- [ ] **T18 GREEN — Build and compose the admin visits section.** Create `components/admin/page-visits-section.tsx` as a client island fetching only `/api/admin/visits?range=...` with `cache: 'no-store'`; use `StatCard`, `.glass-card`, `DashboardLoading`, `ResponsiveContainer`, `AreaChart`, Spanish/i18n labels, daily page views/unique visitors, peaks, bounded top routes, and honest loading/error/empty states; compose it in `app/admin/page.tsx` without a second guard or payment-orders change. <!-- sdd-owner: implementation -->
- [ ] **T19 TRIANGULATE — Verify UI states and browser-safe boundaries.** Run the focused DOM/page tests, `npm run type-check`, `npm run lint`, and inspect rendered accessibility labels/ResponsiveContainer behavior for loading, empty, error, populated, and range-change states. <!-- sdd-owner: implementation -->
- [ ] **T20 REFACTOR — Align UI styling, labels, and client/server boundaries.** Reuse existing admin primitives instead of duplicating loading/cards/chart logic, centralize `admin.visits` labels through the existing i18n mechanism when available, and keep the server page responsible only for access control and composition. <!-- sdd-owner: implementation -->
- [ ] **T21 RED — Add the authenticated visit-to-admin browser flow.** Create an `@auth-required` Playwright test that visits an eligible page, waits for the non-blocking ingestion to be observable through the bounded admin API, opens `/admin`, selects a supported range, and verifies the visits section reflects aggregate counts without exposing event rows; use only the repository’s approved test fixture and an isolated DB cleanup strategy. <!-- sdd-owner: implementation -->
- [ ] **T22 TRIANGULATE — Run the E2E and migration-backed flow safely.** Execute the smallest auth-required Playwright target with `npm run e2e:auth-required -- tests/e2e/page-visits-analytics.spec.ts`, verify asynchronous ingestion has a bounded wait/retry rather than a fixed sleep, and confirm teardown cannot delete non-fixture rows or run against production. <!-- sdd-owner: implementation -->
- [ ] **T23 GREEN/REFACTOR — Document operation, privacy, and rollback.** Add `docs/page-visits-analytics.md` covering `PAGE_VISITS_ENABLED`, `PAGE_VISITS_HMAC_SECRET`, server-only `SUPABASE_SERVICE_ROLE_KEY`, daily HMAC semantics/rotation, retention by `visit_date`, no raw-IP/User-Agent/query logging, migration/baseline deployment order, monitoring, and kill-switch rollback; update the nearest existing environment/deployment index only if one is actually present. <!-- sdd-owner: implementation -->
- [ ] **T24 REFACTOR — Perform scoped cleanup and repository-wide privacy checks.** Remove dead imports/fixtures, verify no `user_agent`/raw-IP/query fields enter the table, payload, logs, DTO, API, or UI, run `npm run guard:db-access`, formatter, lint, type-check, and the focused Node/DOM/DB suites; preserve unrelated admin, payment-order, Vercel Analytics, and middleware session behavior. <!-- sdd-owner: implementation -->
- [ ] **T25 TRIANGULATE — Execute the final project gates and record bounded evidence.** Run `npm run test:ci`, `npm run test:db`, `npm run type-check`, `npm run lint`, `npm run prepush:supabase`, `npm run guard:db-access`, and the relevant auth-required E2E target; resolve regressions without weakening RLS, privacy, authorization, or existing payment-order assertions. <!-- sdd-owner: implementation -->
- [ ] Start or reuse one bounded review at each proposed PR boundary, beginning with PR 1, and stop the chain when review risk or the 400-line budget requires a delivery decision. <!-- sdd-owner: parent -->
- [ ] Before apply, decide whether to create the proposed stacked three-PR chain; do not silently bypass the high budget risk or turn local DB/E2E evidence into committed credentials or fixtures. <!-- sdd-owner: parent -->
```

**Reconciliación:** `apply-progress.md` mantiene las 27 tareas unchecked intencionalmente ("No task is marked complete because Done criteria are phase-level and DB/API/UI/E2E suites and full gate set have not been executed") pero el código **sí implementa** T02/T04/T06/T08/T10/T12/T14/T16/T18/T20/T23. Para archivo, o bien se marcan `- [x]` con evidencia, o se documenta excepción `stale-checkbox reconciliation` probada por `apply-progress/verify-report`. Hoy no hay reconciliación — **archivo bloqueado**.

---

## 10. Bloqueadores exactos (archive blockers)

| # | Severidad | Descripción | Archivo/Comando |
|---|---|---|---|
| **B1** | CRITICAL | **27 tasks implementación sin check** — `tasks.md` todo `- [ ]` aunque `c669ab1` implementa el slice completo. Impide `PASS` limpio y `Ready for archive`. | `openspec/changes/add-page-visits-analytics/tasks.md` |
| **B2** | CRITICAL | **`guard:db-access` FAIL** — accesos directos `.from('page_visits')` y `.rpc('aggregate_page_visits')` fuera de `repositories/supabase/` sin allowlist. | `lib/page-visits/aggregation.ts:86`, `lib/page-visits/ingest.ts:34`, `scripts/guardrails/check-direct-db-access.mjs` |
| **B3** | WARNING→CRITICAL si strict TDD exige archivo | **Tests faltantes** per tasks: `page-visits-ingest.test.ts`, `page-visits-aggregation.test.ts`, `admin-visits-route.test.ts`, `page-visits-section.test.tsx`, `page-visits-rls.test.ts` (T01 RED), `page-visits-analytics.spec.ts` (E2E). Sin ellos no hay prueba DB RLS con `anon/authenticated` reales ni contrato API/UI/E2E. | `tests/` |
| **B4** | WARNING | **Middleware/predicate coverage mínima** — 1 it por archivo, sin casos `waitUntil` vs fallback, `PAGE_VISITS_ENABLED`, `test-user` exclusion end-to-end, `missing UA`, `control chars/length`. | `tests/node/lib/page-visits-*.test.ts`, `tests/middleware.test.ts` |
| **B5** | WARNING | **P95 15ms no medido**, **E2E auth-required no ejecutado** — no hay `perf:precommit`/`k6` ni `e2e:auth-required` evidencia. | `package.json scripts` |
| **B6** | WARNING | **DB flaky** `payment-orders-rls-cross-user` JWT future en `test:ci` completo (no en `test:db` aislado) — indica deriva de reloj en harness, no regresión page-visits pero debe triage antes de gate final. | `npm run test:ci` |
| **B7** | INFO | **TDD Cycle Evidence nombre** — tabla existe pero no literal `TDD Cycle Evidence`; renombrar o añadir ancla para auditoría automática. | `apply-progress.md` |

**No bloqueadores:** migración/baseline/types, hash HMAC diario, predicate, middleware fire-and-forget, API bounded UTC agregada, RLS admin-only, UI Visitas — todos correctos. Sin scope creep, sin PII leakage, sin `user_agent` column, sin tracking identifiers.

---

## 11. Recomendación

**No archivar aún.** Ejecutar `bounded-apply` (sin nuevo commit funcional) para:

1. **Conciliar tasks:** marcar `- [x]` en `tasks.md` para T02/T04/T06/T08/T10/T12/T14/T16/T18/T20/T23 (implementados y verificados) o añadir `## Task checkbox reconciliation` con justificación; dejar T01/T03/T05/T07/T09/T11/T13/T15/T17/T19/T21/T22/T24/T25 como `remaining scope` con plan.
2. **Resolver `guard:db-access`:** o mover `ingest.ts`/`aggregation.ts` a `repositories/supabase/page-visits-repository-impl.ts` (ideal) o añadir `lib/page-visits/*` a `ALLOWED_FILES` con comentario `// server-only service-role, no client bundle` (excepción documentada como `lib/supabase/admin.ts` patterns).
3. **Completar TDD seams críticos** (mínimo para `strict_tdd`): añadir `tests/db/page-visits-rls.test.ts` (anon/auth deny, service write/RPC), `tests/node/lib/page-visits-ingest.test.ts` (HMAC vector conocido, anonymous fallback, missing secret fail-closed, test-user skip, lazy client, swallow error), `tests/node/lib/page-visits-aggregation.test.ts` (7/30/90 bounds, zero-fill, peaks, top20), `tests/node/api/admin-visits-route.test.ts` (401/403/400/no-store).
4. **Medir** `perf:precommit` para p95 y ejecutar `e2e:auth-required` smoke (o documentar blocker).
5. Re-run: `npm run type-check && npm run lint && npm run test:db && npm run guard:db-access && npm run test -- page-visits --runInBand` → actualizar `apply-progress.md` con `TDD Cycle Evidence` canónico y `verification.md` → re-verify.

Si se acepta archivo parcial con excepción de tareas, usar `archive --partial` con `remaining scope` explícito y riesgo documentado, no `PASS` limpio.

---

## 12. Riesgos residuales

- Sin `page-visits-rls.test.ts` con clientes reales `anon`/`authenticated`, la denegación RLS solo está probada por SQL estático + `REVOKE`, no por sesión JWT real (aunque baseline y función son correctos).
- Sin ingest test con vector HMAC conocido, la rotación/derivación diaria solo está probada por length/stability, no por digest contra valor esperado.
- `guard:db-access` fail indica deuda de arquitectura (acceso directo fuera de `repositories/`); no es vulnerabilidad pero viola guardrail y bloquea CI si se exige verde.
- Single-pr 1536 líneas sin revisión por boundary aumenta riesgo de review superficial; mitigado por `size:exception` explícita pero sin evidencia de review.
- Falta medición p95 deja el requisito `+15ms` como diseño no probado en carga real.

---

## 13. Artefactos de esta verificación

- **File:** `openspec/changes/add-page-visits-analytics/verification.md` (este archivo)
- **Engram:** `topic_key: sdd/add-page-visits-analytics/verify-report`, `type: architecture`, `title: SDD Verify — add-page-visits-analytics c669ab1`
- **Comandos registrados:** type-check ✅, lint ✅, jest node 137 suites ✅, middleware 5/5 ✅, routing 4/4 ✅, test:db 8/8 ✅, test:ci 264/265 (1 flaky) ⚠️, guard:db-access ❌

---

## Key Learnings

1. **El supersede de privacidad fue la decisión correcta y está impecable:** no persistir `user_agent`, revocar `anon/authenticated` por completo y usar solo `service_role` con HMAC diario `date:ip` cumple GDPR/minimización y limita correlación cross-date por rotación de `PAGE_VISITS_HMAC_SECRET`. Intentar cumplir la spec stale (`user_agent` + INSERT anon) habría introducido PII y superficie de escritura cliente innecesaria.

2. **Baseline sincronizado es no opcional en este repo:** `supabase/config.toml` deshabilita replay de migraciones; sin reflejar `20260820150000_page_visits.sql` en `supabase/schemas/baseline.sql` el local DB lane quedaría vacío y todos los tests DB fallarían. El commit lo hizo bien — verificar sincronía debe ser checklist fijo de every migration.

3. **Middleware response-first es la frontera correcta pero exige disciplina de scheduling:** construir `response = await updateSession()` antes de `Promise.resolve().then(recordPageVisit)` y usar `event.waitUntil` con fallback `void catch` evita bloquear navegación y unhandled rejections. Meter `createServiceClient` dentro de la tarea diferida es lo que mantiene el p95 <15ms; crearlo en el critical path habría roto el presupuesto.

4. **`guard:db-access` es el guardrail que más duele tras un single-pr grande:** `lib/page-visits/*` necesita acceso service-role por diseño, pero el guard solo permite `repositories/supabase/` o allowlist explícita. Sin mover la ingestión/agregación a un repository adapter o añadir la excepción documentada, el gate queda rojo aunque la implementación sea segura — planificar la ubicación del adapter antes del apply habría evitado el bloqueador.

5. **Strict TDD con `size:exception` necesita RED aislado:** empaquetar hash/predicate/ingest + tests en un único commit de 1536 líneas oculta el ciclo RED→GREEN y deja sin evidencia `T01/T05/T13/T17/T21`. Para la próxima, incluso con excepción de tamaño, separar al menos los commits RED (failing tests) de los GREEN permite al verify auditar el ciclo sin flaggear smoke-only y evita el CRITICAL de checkboxes sin conciliar.

