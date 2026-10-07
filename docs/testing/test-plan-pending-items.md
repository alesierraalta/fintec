# Test plan — FinTec · Pending Items (checklists compras/pagos)

Created: 2026-10-06 · Last updated: 2026-10-07 · Plan path: `docs/testing/test-plan-pending-items.md` · Sandbox: scratchpad + Postgres efímero (docker) · Findings precision: 2 / 5
Baseline: `9f472187` · untracked files: 127 · fingerprint: `78c176ded4d18f55ff6d7288103332ae04817654497c08e036b114626157ce8f` (a change is anything that differs from this fingerprint, not raw `git status`; the plan itself is excluded)

Tables are the format: prose never replaces a row.
A finding is a row whose cell opens with `path:line` and one line of finding. The path is a file with an
extension (`src/a.js:5`), a dotfile (`.gitignore:1`) or a conventional build file (`Makefile:3`); a
directory or a `host:port` is not a location.
A finding that lives only in prose does not exist for the scorer.

## Inventory

| Surface                  | Entry points                                                                            | Owner module | Notes                                               |
| ------------------------ | --------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------- |
| Migración SQL            | `supabase/migrations/20261005120000_add_pending_items.sql`                              | db           | Tabla, índice, RLS (4 políticas), FK a transactions |
| Contrato repositorio     | `repositories/contracts/pending-items-repository.ts`, `repositories/contracts/index.ts` | repositories | `pendingItems` en `AppRepository`                   |
| Impl Supabase            | `repositories/supabase/pending-items-repository-impl.ts`                                | repositories | proyección, `assertUserScope`, `toDomain`           |
| Impl local Dexie         | `repositories/local/pending-items-repository-impl.ts`, `repositories/local/db.ts`       | repositories | tabla `pendingItems` v5, `[userId+done]`            |
| Página checklist         | `app/pending/page.tsx`                                                                  | app          | `parseAmountInput:41`, toggle optimista, conversión |
| Conversión a transacción | `components/forms/transaction-form.tsx`                                                 | forms        | `prefill` + `onSuccess(transaction)`                |
| Navegación               | `components/layout/navigation.ts`                                                       | layout       | entrada `Pendientes` en `mobileSecondaryNavigation` |

## Ranked targets

Rows are never removed by budget; budget changes order and status only. Rows contributed by a
sibling in the layer sweep name that sibling in "Sibling skill".

| Target                                                       | Blast radius | Churn / past fixes | Consequence class                                         | Existing evidence                                              | Altitude                | Target rung | Sibling skill                  | Verdict | Status | Run           |
| ------------------------------------------------------------ | ------------ | ------------------ | --------------------------------------------------------- | -------------------------------------------------------------- | ----------------------- | ----------- | ------------------------------ | ------- | ------ | ------------- |
| Migración: naming/orden/idempotencia/reversibilidad          | High         | New                | Migration silently skips or breaks schema                 | `tests/node/repositories/pending-items-migration.test.ts`      | Unit / SQL              | L1          | `database-persistence-testing` | probe   | done   | pending-items |
| RLS: aislamiento por usuario (dual persona A vs B)           | High         | New                | Data leak across users                                    | políticas en `20261005120000_add_pending_items.sql:21-44`      | Integration / SQL       | L3          | `database-persistence-testing` | probe   | done   | pending-items |
| FK `converted_transaction_id` sin índice                     | Medium       | New                | Full scan on deletes/cascades                             | `20261005120000_add_pending_items.sql:14`                      | Unit / SQL              | L1          | `database-persistence-testing` | probe   | done   | pending-items |
| Paridad Supabase/Dexie del contrato `PendingItemsRepository` | High         | New                | Local y remoto divergen silenciosamente                   | `tests/node/repositories/pending-items-parity.test.ts`         | Unit                    | L2          | `exploit-testing`              | probe   | done   | pending-items |
| Clases de entrada del parser de importes y toggle optimista  | High         | New                | Importe corrupto / estado inconsistente tras fallo        | `tests/app/pending-page.test.tsx`                              | Component               | L4          | `exploit-testing`              | probe   | done   | pending-items |
| Conversión a transacción (prefill → runFinancialMutation)    | High         | New                | Gasto duplicado o mal registrado                          | `tests/app/pending-page.test.tsx`                              | Component / Integration | L4          | `exploit-testing`              | probe   | done   | pending-items |
| Journey real /pending (alta → toggle → convertir → limpiar)  | High         | New                | Flujo roto visible para usuario                           | —                                                              | E2E / Journey           | L5          | `real-run-validation`          | probe   | done   | pending-items |
| Superficie estática: secretos y guard de acceso a DB         | Medium       | New                | Secret leak / bypass de regla de repositorio              | `scripts/guardrails/check-direct-db-access.mjs`                | Static                  | L1          | `appsec-adversarial-auditor`   | probe   | done   | pending-items |
| Prefill del TransactionForm al convertir un item             | Medium       | New                | Modal abre vacío y el usuario reescribe el importe (f-06) | `tests/dom/components/forms/transaction-form-prefill.test.tsx` | Component / E2E         | L4          | `exploit-testing`              | probe   | done   | pending-items |

Verdicts: probe · pin · none. Statuses: pending · in progress · done · blocked · n/a.
A `none` verdict is created with status `n/a`; the execution ratio excludes `n/a` rows.

## Real-run recipes

How each critical journey is driven for real (`real-run-validation`), so EXECUTE never rediscovers it.

| Journey                | Start command                                                                                                  | Data setup                                             | Sample requests                                                        | Expected observable                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------- |
| /pending server-render | `npm run dev` (puerto 3000)                                                                                    | `NEXT_PUBLIC_DB_PROVIDER=local` (Dexie) para e2e local | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/pending` | 200 y markup de las dos checklists |
| Suite del feature      | `npx jest tests/app/pending-page.test.tsx tests/node/repositories/pending-items-migration.test.ts --runInBand` | fixtures en tests                                      | —                                                                      | exit 0, tests PASS                 |
| RLS dual persona       | Postgres efímero con schema `auth` falso (`auth.uid()`)                                                        | dos roles `SET LOCAL app.user_id`                      | INSERT/SELECT cruzados A→B                                             | SELECT de B no devuelve filas de A |

## Layer matrix

The `Run` column identifies which bounded run owns each layer and target row; leave it blank for unscoped work.

| Layer                      | Skill                                                       | Scope                                                                                           | Status | Run           |
| -------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ | ------------- |
| Security                   | `appsec-adversarial-auditor`                                | auth boundaries, untrusted input, secrets                                                       | done   | pending-items |
| Runtime and faults         | `runtime-reliability-testing`, `resilience-fault-injection` | n/a — el feature no toca rutas de red, workers ni concurrencia de servidor; decisión registrada | n/a    | pending-items |
| Persistence and migrations | `database-persistence-testing`                              | migration naming/order/idempotency, isolation, N+1                                              | done   | pending-items |
| Architecture conformance   | `clean-architecture-audit`                                  | layer purity vía guard de acceso a DB + uso exclusivo del contrato de repositorio               | done   | pending-items |
| Critical e2e journeys      | `real-run-validation`                                       | /pending alta-toggle-convertir-limpiar, render server de la ruta                                | done   | pending-items |
| Sandbox                    | `docker-test-containers`                                    | Postgres efímero para migración/RLS, environment proof                                          | done   | pending-items |

Statuses: pending · in progress · done · blocked · n/a. `plan gaps` counts a row as swept when its
status cell reads `done`, `fixed` or `closed`, and drops `n/a`, `na`, `none` and `skipped` from the
denominator entirely; the `Skill` cell only labels the rows still owed. In a plan that declares
`Light:`, every `n/a` row also states its reason in the `Scope` cell, and the declared blast radius
(`Light: <blast radius> · touches <classes>`) must be corroborated by the plan: either it equals a
`Target` cell in Ranked targets exactly, or it is a file path the plan cites somewhere as `path:line`. Write the path without `:line` in the declaration; the check compares
it with the part of each citation before the colon.

## Not testing, on purpose

| Target                                                                | Reason                                                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| k6/load sobre /pending                                                | checklist de uso personal, carga trivial; sin presupuesto de latencia que defender                                              |
| i18n del copy de la página                                            | UI es-ES fija por decisión de producto                                                                                          |
| Verificación en vivo contra Supabase remoto desde tests automatizados | la migración se aplicó y auditó vía `db query --linked` (ev-11); el guard de acceso a DB prohíbe que los tests toquen el remoto |

## Characterization (legacy)

| Test | Behavior pinned | Believed correct? | Promote or delete after the change |
| ---- | --------------- | ----------------- | ---------------------------------- |
|      |                 |                   |                                    |

## Execution log

| Date       | Target                                                   | Rung reached | Findings (path:line) | Promoted tests                                                                                                                    | Evidence (ledger id) | Notes                                                                                                                                                                           |
| ---------- | -------------------------------------------------------- | ------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-06 | Migración (×2 idempotencia + constraints)                | L1           | f-01                 | `tests/node/repositories/pending-items-migration.test.ts :: creates table, indexes, and RLS policies` (ampliado)                  | ev-01, ev-02, ev-05  | Postgres 16-alpine efímero; 4 constraints rechazan inválidos                                                                                                                    |
| 2026-10-06 | RLS dual persona A/B                                     | L3           | —                    | —                                                                                                                                 | ev-03                | rol `app_user` no-superuser + `auth.uid()` sintética; 4 vectores + happy path                                                                                                   |
| 2026-10-06 | FK / CASCADE / SET NULL                                  | L1           | f-01                 | —                                                                                                                                 | ev-04, ev-05         | CASCADE al borrar usuario; SET NULL al borrar transacción                                                                                                                       |
| 2026-10-06 | Paridad Supabase/Dexie                                   | L2           | f-03, f-04           | `tests/node/repositories/pending-items-parity.test.ts` (nueva, 13 tests)                                                          | ev-06                | Dexie real (fake-indexeddb) + mock PostgREST con payload asserts                                                                                                                |
| 2026-10-06 | Parser + toggle optimista adversarial                    | L4           | —                    | `tests/app/pending-page.test.tsx` (+8 tests adversariales)                                                                        | ev-07                | rollback, undo, coma decimal, límite 200, create fallido                                                                                                                        |
| 2026-10-06 | Journey real /pending                                    | L5           | —                    | —                                                                                                                                 | ev-08                | `next dev` + HTTP real: 200 en /pending, 404 en ruta inexistente; navegador no disponible en este entorno                                                                       |
| 2026-10-06 | Regression gate                                          | gate         | f-02                 | `tests/components/navigation.test.ts :: keeps secondary routes complementary` (actualizado)                                       | ev-09                | test:ci 2155 passed / 1 failed→fixed; type-check, lint, guard, secretlint                                                                                                       |
| 2026-10-06 | Parser decimal/miles (f-05)                              | L1→L4        | f-05                 | +6 tests de clases en `tests/app/pending-page.test.tsx` (20 total)                                                                | ev-10                | red→green→red(simetría)→green; gramática estricta: solo dígitos, coma 1-2 dec, grupos de miles                                                                                  |
| 2026-10-07 | Migración aplicada a Supabase remoto + audit             | L1           | —                    | —                                                                                                                                 | ev-11                | vía `db query --linked` (push bloqueado por `[db.migrations] enabled=false` en config.toml:83); audit de constraints/índices/RLS true; idempotencia EXIT=0 ×2 en el remoto real |
| 2026-10-07 | Doble conversión post-transacción (hipótesis 2)          | L4           | —                    | `tests/app/pending-page.test.tsx :: pins the double-booking window when the post-transaction link fails` (probe, caracterización) | ev-12                | falla el link → 1 tx creada → item sigue convertible → reintento → 2 linkedTransactionIds; pinned para decisión de producto                                                     |
| 2026-10-07 | Journey real de navegador /pending (Playwright chromium) | L5           | f-06                 | `tests/e2e/pending-items-journey.spec.ts` (2 passed) + `tests/dom/components/forms/transaction-form-prefill.test.tsx`             | ev-13                | seed GoTrue por cookie + stubs /auth/v1/user y /rest/v1/users; formato CLDR es-ES: es `~$1234,00` SIN separador de miles (no `~$1.234,00`); E2E_EXIT=0 real (PIPESTATUS)        |

## Findings

A rejected or wontfix finding is a known non-issue: it is never re-proposed unless the fingerprint
of its cited files changed; when a run skips it, it cites the row. Severity is the consequence class
(`references/prioritization.md`); always state whether data is safe. A `confirmed` or `fixed`
finding names the promoted test that asserts the promised behaviour, so it is red on the current
code and green once fixed (rule 13); a test written the other way round is a characterization
test and says so in its name. A finding that never got a test stays `open`, reason `not pinned`.
The fingerprint cell holds the `assets/fingerprint.sh` output, one or more git SHAs, `-` when none
is recorded, or `pending` while the value is owed; `plan check` refuses anything else.

| Id   | Finding (path:line, one line)                                                                                                                                                                                                                  | Severity (consequence class) | Data safe?                                                     | Evidence id | Pinning test (suite path :: test name)                                                                                                           | Status     | Verdict by / date | Reason                                                                                                                                                                            | Cited-files fingerprint at verdict |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| f-01 | `supabase/migrations/20261005120000_add_pending_items.sql:19` — FK `converted_transaction_id` sin índice: DELETE/UPDATE sobre `transactions` escanearía `pending_items`                                                                        | Medium                       | Sí (rendimiento, no corrección)                                | ev-05       | `tests/node/repositories/pending-items-migration.test.ts :: creates table, indexes, and RLS policies`                                            | fixed      | tsp / 2026-10-06  | observado SIN INDICE → fix `idx_pending_items_converted_transaction` → audit true                                                                                                 | 9f472187                           |
| f-05 | `app/pending/page.tsx:41` — `parseAmountInput` leía "1.234" como ~$1,23 (factor 1000) y `parseFloat` truncaba "1,234"/"1,5,5"/"1 234" a importes corruptos                                                                                     | Major                        | Sí tras el fix: antes guardaría importes 1000x menores         | ev-10       | `tests/app/pending-page.test.tsx :: treats a dot as a thousands separator (1.234 → 1234 USD)` (+4 tests de clases)                               | fixed      | tsp / 2026-10-06  | red (2 clases) → fix → review de simetría destapó 3 clases más → red (3) → gramática estricta → green 20/20                                                                       | 9f472187                           |
| f-02 | `tests/components/navigation.test.ts:13` — snapshot de rutas secundarias desactualizado tras añadir `/pending`; era la única suite en rojo del repo                                                                                            | Minor                        | Sí                                                             | ev-09       | `tests/components/navigation.test.ts :: keeps secondary routes complementary`                                                                    | fixed      | tsp / 2026-10-06  | lista esperada actualizada con `/pending` en su posición real                                                                                                                     | 9f472187                           |
| f-03 | `repositories/local/pending-items-repository-impl.ts:58` — `deleteCompleted` con filtro por kind era correcto pero no tenía ningún test (gap)                                                                                                  | Minor                        | Sí                                                             | ev-06       | `tests/node/repositories/pending-items-parity.test.ts :: deleteCompleted removes only done items of the given kind and keeps everything else`    | gap-closed | tsp / 2026-10-06  | comportamiento correcto, ahora sostenido por test                                                                                                                                 | 9f472187                           |
| f-04 | `repositories/supabase/pending-items-repository-impl.ts:53` — aislamiento cross-user del repo (`assertUserScope`) sin test previo (gap)                                                                                                        | Major                        | Sí                                                             | ev-06       | `tests/node/repositories/pending-items-parity.test.ts :: negative control: same user reaches the table, cross-user is rejected before any query` | gap-closed | tsp / 2026-10-06  | negative control: B rechazado sin llegar a tocar la tabla; sin auth, ídem                                                                                                         | 9f472187                           |
| f-06 | `components/forms/transaction-form.tsx:187` — el useEffect de reset en mount limpiaba el `prefill` (Descripción/Monto vacíos al convertir un item); un guard de "primer run" no basta: React StrictMode ejecuta los efectos de mount dos veces | Minor                        | Sí (UX: el usuario reescribía los datos; sin riesgo de dinero) | ev-13       | `tests/dom/components/forms/transaction-form-prefill.test.tsx :: keeps the prefilled description and amount when the form opens`                 | fixed      | tsp / 2026-10-07  | fix: la rama blank del reset replica el useState initializer (incluye `prefill`) → montaje idempotente; rojo documentado en jsdom y reproducido en Chromium real (screenshot E2E) | 9f472187                           |

Statuses: open · confirmed · fixed · gap-closed · rejected · wontfix.
`gap-closed` is a behaviour that was correct but untested, now held by the promoted test it names; like
`confirmed` and `fixed` it owes that test.

## Evidence ledger

One row per `observado` conclusion (`references/evidence.md`). `razonado` items go under
"Hypotheses" below, never here.

`Admit` holds ONE bare shell command, with no backticks and no placeholders, because `Executed` is
prose a human reads and `Admit` is the command the binary runs. `Digest` holds the `sha256:` digest of the
canonical output, written by `tpp plan admit --execute --record <id>` rather than by hand.

A pin only means something over output that holds still, so `--execute` runs each admitted command twice:
the second run is the probe, and a row whose two observations disagree is refused as unstable instead of
pinned. `Normalize` is the escape hatch for the part of an output that legitimately moves, such as an
elapsed time: it holds a Go regular expression whose every match becomes `X` before hashing. Leave it empty
the first time and fill it only when the probe names what moves, keeping it as narrow as that part — a
pattern broad enough to swallow the output turns the pin into decoration. `plan check` requires none of
these columns; `plan admit` refuses a row whose `Admit` is absent, whose `Digest` is unpinned, or whose
output does not hold still.

`Mode` says where the observation was taken, and a pin is only comparable inside the mode it was taken in,
because the same command digests differently in a container than on this machine. An empty cell means `host`,
which is where every pin taken before the column existed was taken. `--sandbox` runs each command in a
container with the tree mounted read-only and no network, and a row that tries to write is refused instead of
admitted. `--record` writes both cells, so recording is how a row's mode gets set; a row pinned in one mode
and checked in the other is refused as a mode mismatch, rather than as a digest mismatch that would say
nothing about why the digests disagree. Only a pin has a mode: a row that carries no digest is refused for the
missing pin, not told it was pinned somewhere.

`Mutate` is the machine half of a falsifiability claim: `<old> => <new> @ <path>:<line>`, one textual edit whose
old text must occur exactly once in that file and on that line, naming a file inside the tree. It is a value and
not a command because a replay has to be able to undo exactly what it did, and an edit admits an exact inverse
while a command does not. A row that declares one is claiming its own command goes red under the edit and green
without it, so the claim is checked rather than believed: `plan admit` refuses a mutation it cannot parse, find,
or tell apart from another, and under `--sandbox` it replays the claim — the edit lands on a copy of the tree git
knows, the command must fail there, the file is put back and its bytes verified, and the command must pass again.
A row whose command survives the edit, or whose restored half fails, is refused; outside `--sandbox` there is no
copy to edit and put back, so the claim is refused rather than admitted unchecked. `Mutation or negative control →
result` stays prose for a human to read; `Mutate` is the part a binary can act on and undo.

A `Mutate` cell may also hold a survey: several edits separated by `;;` (space, two semicolons, space), each
checked before any runs and each replayed on its own copy. An edit prefixed `~` is declared equivalent, so the
command must stay green under it instead of going red; one that goes red is refused as `mutation-not-equivalent`.
The first edit that breaks its declaration refuses the row and is named by its position (`edit 2 of 3`), and an
admitted survey reports its tally (`2 killed, 1 equivalent`). An edit whose own text contains `;;` cannot be
written in a cell.

`Expect` says which way the command must exit: empty or `pass` for zero, `fail` for a FAIL_TO_PASS test
observed red. With `fail` only an exit from 1 to 125 qualifies (126, 127 and signals mean the command never ran as a test, a timeout or a sandbox refusal keeps its own reason, and a zero exit is refused as
`expected-failure-passed`), and the output is pinned exactly as a passing
command's is, so it should show the failing test's name: a compile error must not be able to stand in for the red
test. Prefer it over `! cmd`, which also passes on a compile failure. `Expect` beside `Mutate` is refused, because
a mutation already defines its own red and green runs.

Every row carries exactly one cell per header column (14 here); an empty cell stays as `| |`. A literal
`|` inside a cell is written `\|`, or it splits the cell and `plan check` refuses the row. Add the ledger
row before `tpp plan add-finding` names it: that command writes the Findings row only and refuses
an Evidence id the ledger does not carry.

| Id    | Claim                                                            | Executed   | Admit | Inputs and parameters                                                                                                                                                                      | Observed                                                                                                                                  | Digest | Normalize | Mode | Mutate | Expect | Mutation or negative control → result                                                                                 | Reproduction                                                                                       | Label (`observado` / `razonado`, literal) |
| ----- | ---------------------------------------------------------------- | ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| ev-01 | La migración es idempotente                                      | 2026-10-06 |       | Postgres 16-alpine efímero + `auth.users`/`auth.uid()` sintéticos                                                                                                                          | RUN1_EXIT=0 y RUN2_EXIT=0 (segunda pasada: 0 ERROR, NOTICES skip)                                                                         |        |           | host |        |        | re-ejecución completa sin efectos duplicados                                                                          | sesion 2026-10-06, contenedor fintec-pending-pg                                                    | observado                                 |
| ev-02 | Los constraints rechazan clases inválidas                        | 2026-10-06 |       | kind='otro', amount=0, amount=-5, name=' '                                                                                                                                                 | 4/4 PROBE = OK (check_violation)                                                                                                          |        |           | host |        |        | si un CHECK se quitara, el probe del constraint vuelve a aceptar la fila                                              | sesion 2026-10-06                                                                                  | observado                                 |
| ev-03 | RLS aísla usuarios (dual persona)                                | 2026-10-06 |       | rol `app_user` no-superuser; A=…1111, B=…2222                                                                                                                                              | B_select=0 filas OK; B_insert→rechazado; B_update=UPDATE 0; fila de A intacta tras ataque; happy path de A OK                             |        |           | host |        |        | primera pasada como superuser era void (bypasea RLS) — re-hecha con SET ROLE                                          | sesion 2026-10-06                                                                                  | observado                                 |
| ev-04 | CASCADE y SET NULL funcionan                                     | 2026-10-06 |       | borrar user A → 0 filas huerfanas; borrar tx linked → ref NULL                                                                                                                             | cascade_user_delete=OK; converted_transaction_id=NULL                                                                                     |        |           | host |        |        | si la FK cambiara a NO ACTION, el delete de la tx fallaría                                                            | sesion 2026-10-06                                                                                  | observado                                 |
| ev-05 | `converted_transaction_id` queda indexado tras el fix            | 2026-10-06 |       | audit de pg_indexes sobre pending_items                                                                                                                                                    | antes: SIN INDICE; después: FK audit=true, `idx_pending_items_converted_transaction` presente                                             |        |           | host |        |        | red→green: audit antes/después del índice                                                                             | sesion 2026-10-06                                                                                  | observado                                 |
| ev-06 | Paridad de contrato en ambas impls                               | 2026-10-06 |       | 13 tests: payload snake_case, toggle, conversión, deleteCompleted, multi-user, id inexistente                                                                                              | 13 passed                                                                                                                                 |        |           | host |        |        | negative control cross-user va rojo si `assertUserScope` se elimina                                                   | `npx jest tests/node/repositories/pending-items-parity.test.ts`                                    | observado                                 |
| ev-07 | Parser y toggle sostienen clases adversariales                   | 2026-10-06 |       | 'abc', '20,5', nombre 250 chars, fallos de red en update/delete/create                                                                                                                     | 14 passed (6 previos + 8 adversariales)                                                                                                   |        |           | host |        |        | el test de rollback va rojo si se elimina el catch/rollback del toggle                                                | `npx jest tests/app/pending-page.test.tsx`                                                         | observado                                 |
| ev-08 | La ruta /pending sirve de verdad                                 | 2026-10-06 |       | `NEXT_PUBLIC_DB_PROVIDER=local npm run dev`; curl real                                                                                                                                     | GET /pending → 200 (shell SSR observado); ruta inexistente → 404; dev log sin errores                                                     |        |           | host |        |        | el 404 confirma que el server no sirve cualquier path                                                                 | sesion 2026-10-06                                                                                  | observado                                 |
| ev-09 | Regression gate verde tras fixes                                 | 2026-10-06 |       | test:ci completo (3 projects)                                                                                                                                                              | 2155 passed; único fallo (navigation) corregido y suite verde                                                                             |        |           | host |        |        | el navigation test va rojo si se elimina /pending de navigation.ts                                                    | /tmp/fintec-test-ci.log                                                                            | observado                                 |
| ev-10 | Parser nunca convierte entrada ambigua en dinero                 | 2026-10-06 |       | clases: '1.234'→123400; '1,5'→150; '1.2'/'1,234'/'1,5,5'/'1 234'→null+toast                                                                                                                | 20 passed; red documentado en cada etapa (2, luego 3 clases)                                                                              |        |           | host |        |        | cada clase va roja si se relaja su guard; '1.234' va rojo si se revierte el fix                                       | `npx jest tests/app/pending-page.test.tsx`                                                         | observado                                 |
| ev-11 | Migración pending_items aplicada y verificada en el remoto       | 2026-10-07 |       | `npx supabase db query --linked --file supabase/migrations/20261005120000_add_pending_items.sql` + audit SQL                                                                               | audit: tabla, RLS=true, 3 índices (incl. fix f-01), 4 políticas, 6 constraints; PG17; re-ejecución idempotente EXIT=0 ×2                  |        |           | host |        |        | si la tabla no existiera, el audit va rojo                                                                            | sesion 2026-10-07 (proyecto bfxkcmoccqgvkrrkkdju)                                                  | observado                                 |
| ev-12 | Ventana de doble conversión tras fallo del link (hipótesis 2)    | 2026-10-07 |       | repo que rechaza el 1er update de `convertedTransactionId`                                                                                                                                 | 21 passed; 1 tx creada → toast → item sigue convertible → reintento crea 2ª tx y queda con 2 linkedTransactionIds                         |        |           | host |        |        | probe de caracterización: pinnea el comportamiento actual para decisión de producto (dedupe vs aceptar doble entrada) | `npx jest tests/app/pending-page.test.tsx`                                                         | observado                                 |
| ev-13 | Journey completo /pending pasa en Chromium real tras el fix f-06 | 2026-10-07 |       | `NEXT_PUBLIC_DB_PROVIDER=local PORT=3000 REUSE_EXISTING_SERVER=true npm run e2e:no-auth -- tests/e2e/pending-items-journey.spec.ts --project=chromium`; dev server del usuario reutilizado | 2 passed (7.7s), E2E_EXIT=0 (PIPESTATUS); prefill visible en modal (Descripción='Café del journey', Monto=1234); formato real `~$1234,00` |        |           | host |        |        | el spec del prefill va rojo si la rama blank del reset deja de respetar `prefill`                                     | `npx playwright test tests/e2e/pending-items-journey.spec.ts --project=chromium` (vía e2e:no-auth) | observado                                 |

### Hypotheses (razonado)

| Hypothesis                                                                                                                                                                                                                                                                                                                                     | Probe que la asentaría                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ~~Separador de miles/decimales~~ → **RESUELTA como f-05 (fixed)**: el parser usa gramática estricta es-ES y rechaza toda clase ambigua con toast                                                                                                                                                                                               | cubierta por ev-10                                                                                       |
| ~~Doble conversión si falla el link post-transacción~~ → **PROBADA y PINNEADA (ev-12)**: la ventana existe y el reintento crea una 2ª transacción (1 tx + item convertible tras fallo; 2 linkedTransactionIds tras reintento). Comportamiento actual sostenido por test de caracterización; decisión de producto pendiente (dedupe vs aceptar) | `tests/app/pending-page.test.tsx :: pins the double-booking window when the post-transaction link fails` |

## Calibration history

One row per calibration run (`references/calibration.md`); never overwritten.

| Date | Skill version | K   | Found | Recall | Misses (file:line operator, why) | False positives |
| ---- | ------------- | --- | ----- | ------ | -------------------------------- | --------------- |

## Blocked by testability

| Target                                                                                                | Rung | Why | Minimal change that opens it |
| ----------------------------------------------------------------------------------------------------- | ---- | --- | ---------------------------- |
| (ninguna — el journey de navegador se ejecutó 2026-10-07 con Playwright chromium cacheado; ver ev-13) | —    | —   | —                            |

## Remaining, in order

1. ~~Aplicar la migración a Supabase remoto~~ — **done 2026-10-07** vía `db query --linked` (ev-11). Nota: `supabase db push` sigue bloqueado por `[db.migrations] enabled=false` en `supabase/config.toml:83` y el remoto tiene 14 migraciones locales divergidas (20260726150000 → 20261005120000); un push futuro aplicaría 14, no 1
2. Decisión de producto sobre la ventana de doble conversión (hipótesis 2, pinneada en ev-12): dedupe por linkedTransactionIds o aceptar la doble entrada intencional — exploit-testing + producto
3. Verificación periódica del formato de importes es-ES en nuevos componentes (CLDR: mínimo 2 dígitos de agrupación → `~$1234,00`, no `~$1.234,00`) — real-run-validation
