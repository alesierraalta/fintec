# Test plan — FinTec · Revisión de Fotos y Facturas (Receipts & Invoices)

Created: 2026-10-17 · Last updated: 2026-10-17 · Plan path: `docs/testing/test-plan-receipts.md` · Sandbox: scratchpad + Node.js Jest · Findings precision: 1 / 1
Baseline: `cbbc5946` · untracked files: 10 · fingerprint: `e4e4695b08e66cb08cc96f79130ed05ee9a74385cadf579058c9a6ba65bd27ad` (a change is anything that differs from this fingerprint, not raw `git status`; the plan itself is excluded)

Tables are the format: prose never replaces a row.
A finding is a row whose cell opens with `path:line` and one line of finding. The path is a file with an
extension (`src/a.js:5`), a dotfile (`.gitignore:1`) or a conventional build file (`Makefile:3`); a
directory or a `host:port` is not a location.
A finding that lives only in prose does not exist for the scorer.

## Inventory

| Surface                       | Entry points                                           | Owner module   | Notes                                                                                |
| ----------------------------- | ------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------ |
| Modal de carga en lote        | `components/receipts/batch-receipt-uploader-modal.tsx` | receipts       | Previsualización, lightbox, zoom, cámara directa, edición rápida y confirmación      |
| Zona dropzone individual      | `components/receipts/receipt-scanner-dropzone.tsx`     | receipts       | Subida unitaria, portapapeles, cámara, lightbox modal de zoom y badge fiscal         |
| Subida de comprobante de pago | `components/payment-orders/receipt-upload.tsx`         | payment-orders | Drag & drop comprobante, FileReader preview imagen/PDF, validación 10MB              |
| Panel admin revisión de fotos | `components/payment-orders/admin-panel.tsx`            | payment-orders | Ver comprobante, modal/pestaña, aprobación y rechazo con notas de auditoría          |
| API multimodal scan-receipt   | `app/api/ai/scan-receipt/route.ts`                     | api/ai         | Soporte JSON (base64) y multipart/form-data, rate limit, auth y fallback de cuentas  |
| Servicio OCR y LLM Vision     | `lib/ai/receipt-scanner/scanner-service.ts`            | ai/scanner     | Esquema Zod facturas, notas fiscales, desglose IVA/IGTF, items e inyección de prompt |
| Emparejador de categorías     | `lib/ai/receipt-scanner/category-matcher.ts`           | ai/scanner     | Inferencia de categoría por cesta de artículos y palabras clave                      |
| Hook de escaneo               | `hooks/use-receipt-scanner.ts`                         | hooks          | Compresión de imagen, llamada a API, manejo de estados y timeout                     |

## Ranked targets

Rows are never removed by budget; budget changes order and status only. Rows contributed by a
sibling in the layer sweep name that sibling in "Sibling skill".

| Target                                                               | Blast radius | Churn / past fixes | Consequence class                                                                 | Existing evidence                                              | Altitude        | Target rung | Sibling skill                 | Verdict | Status | Run      |
| -------------------------------------------------------------------- | ------------ | ------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------- | ----------- | ----------------------------- | ------- | ------ | -------- |
| Modal Batch: Lightbox review, zoom y render de foto                  | High         | Modified           | UX blocker / usuario no puede verificar la foto del comprobante                   | `tests/unit/components/receipt-photo-review.test.tsx`          | Component       | L3          | `exploit-testing`             | probe   | done   | receipts |
| Modal Batch: Validación de archivos y límite MAX_BATCH_RECEIPTS (20) | High         | Modified           | App crash por OOM con lotes masivos o archivos corruptos                          | `tests/unit/components/receipt-photo-review.test.tsx`          | Component       | L4          | `exploit-testing`             | probe   | done   | receipts |
| Ciclo de vida de memoria de URLs de foto (`URL.revokeObjectURL`)     | High         | New                | Fuga de memoria en SPAs/WebView móvil con imágenes de alta resolución             | `tests/unit/components/receipt-photo-review.test.tsx`          | Component       | L4          | `runtime-reliability-testing` | probe   | done   | receipts |
| API /api/ai/scan-receipt: Vía multipart/form-data (File binario)     | High         | New                | Fallo silencioso de subida directa sin pasar por base64 en frontend               | `tests/node/api/scan-receipt-multipart.test.ts`                | Integration     | L3          | `exploit-testing`             | probe   | done   | receipts |
| Esquema fiscal SENIAT: Subtotal, IVA 16%, IGTF 3% y desglose         | High         | New                | Montos de impuestos corruptos o bypass de validaciones numéricas                  | `tests/unit/lib/ai/fiscal-invoice-exploit.test.ts`             | Unit            | L1          | `exploit-testing`             | probe   | done   | receipts |
| Inferencia de categorías por contenido de cesta de artículos         | Medium       | Fix                | Categoría equivocada asignada por nombre de razón social genérica                 | `tests/unit/lib/ai/fiscal-invoice-exploit.test.ts`             | Unit            | L2          | `exploit-testing`             | probe   | done   | receipts |
| Subida y revisión admin de comprobantes en PaymentOrders             | Medium       | New                | Administrador no puede auditar el comprobante antes de aprobar orden              | `tests/unit/components/payment-orders-receipt-review.test.tsx` | Component       | L3          | `exploit-testing`             | probe   | done   | receipts |
| Invariante de seguridad contra inyecciones de prompt en facturas     | High         | Hardened           | Manipulación de tipo de transacción o montos mediante texto malicioso en facturas | `tests/unit/lib/ai/fiscal-invoice-exploit.test.ts`             | Unit / Security | L1          | `appsec-adversarial-auditor`  | probe   | done   | receipts |

Verdicts: probe · pin · none. Statuses: pending · in progress · done · blocked · n/a.
A `none` verdict is created with status `n/a`; the execution ratio excludes `n/a` rows.

## Real-run recipes

How each critical journey is driven for real (`real-run-validation`), so EXECUTE never rediscovers it.

| Journey                                | Start command                                                                                                                                                                                                                          | Data setup                | Sample requests                                 | Expected observable    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------- | ---------------------- |
| Suite completa de fotos y facturas     | `npx jest tests/unit/components/receipt-photo-review.test.tsx tests/unit/components/payment-orders-receipt-review.test.tsx tests/node/api/scan-receipt-multipart.test.ts tests/unit/lib/ai/fiscal-invoice-exploit.test.ts --runInBand` | Fixtures y mocks en tests | —                                               | exit 0, 37 passed      |
| Regresión suites existentes de scanner | `npx jest tests/unit/components/batch-receipt-uploader.test.tsx tests/unit/components/receipt-scanner-dropzone.test.tsx tests/unit/hooks/use-receipt-scanner.test.ts tests/node/api/scan-receipt-route.test.ts --runInBand`            | Fixtures y mocks en tests | —                                               | exit 0, 55 passed      |
| Flujo de escaneo multipart             | `node -e 'require("./tests/node/api/scan-receipt-multipart.test.ts")'`                                                                                                                                                                 | Mock Auth + Repo          | POST /api/ai/scan-receipt (FormData con imagen) | 200, json.success=true |

## Layer matrix

The `Run` column identifies which bounded run owns each layer and target row; leave it blank for unscoped work.

| Layer                      | Skill                          | Scope                                                                                | Status | Run      |
| -------------------------- | ------------------------------ | ------------------------------------------------------------------------------------ | ------ | -------- |
| Security                   | `appsec-adversarial-auditor`   | prompt injection en notas/comercio, saneamiento de inyección SQL en RIF y N° factura | done   | receipts |
| Runtime and faults         | `runtime-reliability-testing`  | gestión de memoria de Object URLs, límites de tamaño (10MB) y rate-limiting          | done   | receipts |
| Persistence and migrations | `database-persistence-testing` | n/a — este run cubre componentes UI de foto, parsing de facturas y endpoints AI      | n/a    | receipts |
| Architecture conformance   | `clean-architecture-audit`     | desacoplamiento de componentes de presentación, contratos de tipos y servicios OCR   | done   | receipts |
| Critical e2e journeys      | `real-run-validation`          | previsualización en lightbox, zoom, subida multipart y confirmación de factura       | done   | receipts |
| Sandbox                    | `docker-test-containers`       | n/a — ejecución directa en runner Node.js / jsdom con sandboxing estricto            | n/a    | receipts |

Statuses: pending · in progress · done · blocked · n/a. `plan gaps` counts a row as swept when its
status cell reads `done`, `fixed` or `closed`, and drops `n/a`, `na`, `none` and `skipped` from the
denominator entirely; the `Skill` cell only labels the rows still owed. In a plan that declares
`Light:`, every `n/a` row also states its reason in the `Scope` cell, and the declared blast radius
(`Light: <blast radius> · touches <classes>`) must be corroborated by the plan: either it equals a
`Target` cell in Ranked targets exactly (a directory works this way), or it is a file path the plan
cites somewhere as `path:line`. Write the path without `:line` in the declaration; the check compares
it with the part of each citation before the colon.

## Not testing, on purpose

| Target                                                | Reason                                                                                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Llamadas en vivo a API de Gemini Multimodal           | Requiere claves privadas de producción y cuota de red en suite de CI; se prueba vía mock de servicio y evals dedicadas (`eval:receipts`) |
| Pruebas de cámara física en hardware real de teléfono | Limitación del entorno de servidor headless de CI; cubierto con atributos `capture="environment"` e inspección en emulador Android       |
| Servidor de buckets Supabase Storage en vivo          | Protegido por mocks de cliente; la integridad de URLs está validada en pruebas unitarias y de integración                                |

## Characterization (legacy)

| Test                                                                                                                               | Behavior pinned                                                        | Believed correct? | Promote or delete after the change |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------- | ---------------------------------- |
| `tests/unit/components/receipt-scanner-dropzone.test.tsx :: renders line items with null or undefined totalPrice without crashing` | Tolera artículos con precio nulo o indefinido sin provocar crash en UI | Correct           | Promoted into suite                |

## Execution log

| Date       | Target                                                        | Rung reached | Findings (path:line) | Promoted tests                                                           | Evidence (ledger id) | Notes                                                                          |
| ---------- | ------------------------------------------------------------- | ------------ | -------------------- | ------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------ |
| 2026-10-17 | Suite de revisión de fotos y ciclo de vida de memoria         | L3           | —                    | `tests/unit/components/receipt-photo-review.test.tsx` (10 tests)         | ev-01, ev-02, ev-03  | Lightbox, zoom, validación de formato no-imagen, límite 20, revokeObjectURL    |
| 2026-10-17 | Suite de subida y auditoría de comprobantes PaymentOrders     | L3           | —                    | `tests/unit/components/payment-orders-receipt-review.test.tsx` (9 tests) | ev-08                | Subida con preview FileReader, validación 10MB, botón Ver Comprobante admin    |
| 2026-10-17 | Suite de subida multipart en /api/ai/scan-receipt             | L3           | —                    | `tests/node/api/scan-receipt-multipart.test.ts` (7 tests)                | ev-06, ev-07         | FormData con File binario, 10MB limit, validación de tipo y parsing de cuentas |
| 2026-10-17 | Facturas fiscales SENIAT, impuestos y deducción de categorías | L2           | f-01                 | `tests/unit/lib/ai/fiscal-invoice-exploit.test.ts` (11 tests)            | ev-04, ev-05         | Invariantes IVA/IGTF, desglose de notas, prompt injection y fix de categorías  |
| 2026-10-17 | Regression gate suites completas de comprobantes              | gate         | —                    | 8 suites ejecutadas (92 tests pasando en 4.0s)                           | ev-01 a ev-08        | 0 fallos, 100% verde en todas las superficies de fotos y facturas              |

## Findings

A rejected or wontfix finding is a known non-issue: it is never re-proposed unless the fingerprint
of its cited files changed; when a run skips it, it cites the row. Severity is the consequence class
(`references/prioritization.md`); always state whether data is safe. A `confirmed` or `fixed`
finding names the promoted test that asserts the promised behaviour, so it is red on the current
code and green once fixed (rule 13); a test written the other way round is a characterization
test and says so in its name. A finding that never got a test stays `open`, reason `not pinned`.
The fingerprint cell holds the `assets/fingerprint.sh` output, one or more git SHAs, `-` when none
is recorded, or `pending` while the value is owed; `plan check` refuses anything else.

| Id   | Finding (path:line, one line)                                                                                                               | Severity (consequence class) | Data safe?                                        | Evidence id | Pinning test (suite path :: test name)                                                                                                | Status | Verdict by / date | Reason                                                                                                                  | Cited-files fingerprint at verdict |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| f-01 | `lib/ai/receipt-scanner/category-matcher.ts:163` — falta de categoría hogar y palabras de farmacia en keywords causaba colisión con compras | Medium                       | Sí (clasificación contable previa a confirmación) | ev-04       | `tests/unit/lib/ai/fiscal-invoice-exploit.test.ts :: infers Salud category from pharmacy items even when merchant name looks generic` | fixed  | tsp / 2026-10-17  | red (clasificado erróneamente por token 'compra') → fix (separa categoría hogar y enriquece salud/alimentacion) → green | cbbc5946                           |

Statuses: open · confirmed · fixed · gap-closed · rejected · wontfix.
`gap-closed` is a behaviour that was correct but untested, now held by the promoted test it names; like
`confirmed` and `fixed` it owes that test.

## Evidence ledger

One row per `observado` conclusion (`references/evidence.md`). `razonado` items go under
"Hypotheses" below, never here.

`Admit` holds ONE bare shell command, with no backticks and no placeholders, because `Executed` is
prose a human reads and `Admit` is the command the binary runs. `Digest` holds the `sha256:` digest of the
canonical output, written by `rdd-plus plan admit --execute --record <id>` rather than by hand.

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
row before `rdd-plus plan add-finding` names it: that command writes the Findings row only and refuses
an Evidence id the ledger does not carry.

| Id    | Claim                                                                             | Executed   | Admit | Inputs and parameters                                                                     | Observed                           | Digest | Normalize | Mode | Mutate | Expect | Mutation or negative control → result                                                   | Reproduction                                                            | Label (`observado` / `razonado`, literal) |
| ----- | --------------------------------------------------------------------------------- | ---------- | ----- | ----------------------------------------------------------------------------------------- | ---------------------------------- | ------ | --------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------- |
| ev-01 | Previsualización y lightbox modal funcionan de forma interactiva y accesible      | 2026-10-17 |       | Clic en thumbnail abre lightbox con dialog role, nombre de archivo y ref tag              | 10 passed en suite de photo-review |        |           | host |        |        | Si se quita el onClick del thumbnail, el lightbox nunca abre (fallo observable)         | `npx jest tests/unit/components/receipt-photo-review.test.tsx`          | observado                                 |
| ev-02 | Validación estricta de fotos rechaza archivos no-imagen y limita lote a 20        | 2026-10-17 |       | PDF/TXT descartados con toast de error; lote de 25 archivos recortado a 20                | 10 passed                          |        |           | host |        |        | Si se quita el filtro de file.type, se intentarían procesar archivos binarios corruptos | `npx jest tests/unit/components/receipt-photo-review.test.tsx`          | observado                                 |
| ev-03 | Object URLs son revocadas en eliminación, descarte de duplicados y vaciar lista   | 2026-10-17 |       | Verificación de llamadas a URL.revokeObjectURL con URLs blob                              | 10 passed                          |        |           | host |        |        | Si no se revoca, las fotos en memoria quedan en cache del navegador                     | `npx jest tests/unit/components/receipt-photo-review.test.tsx`          | observado                                 |
| ev-04 | Categorías son deducidas por artículos de la cesta cuando el comercio es genérico | 2026-10-17 |       | Cesta de alimentos infiere Alimentación; farmacia infiere Salud; ferretería infiere Hogar | 11 passed (f-01 resuelto)          |        |           | host |        |        | Si se eliminan las keywords de farmacia, el test infers Salud falla en rojo             | `npx jest tests/unit/lib/ai/fiscal-invoice-exploit.test.ts`             | observado                                 |
| ev-05 | Esquema Zod valida facturas SENIAT con RIF, IVA 16%, IGTF 3% y subtotal           | 2026-10-17 |       | Facturas válidas parsean; subtotales o impuestos negativos se rechazan estrictamente      | 11 passed                          |        |           | host |        |        | Si se relaja z.number().nonnegative(), impuestos negativos entrarían a contabilidad     | `npx jest tests/unit/lib/ai/fiscal-invoice-exploit.test.ts`             | observado                                 |
| ev-06 | Endpoint /api/ai/scan-receipt procesa cargas multipart/form-data con File binario | 2026-10-17 |       | FormData con File binario convierte a base64 data URL y extrae datos con éxito            | 7 passed                           |        |           | host |        |        | Si se desactiva la rama multipart, la petición falla con 400                            | `npx jest tests/node/api/scan-receipt-multipart.test.ts`                | observado                                 |
| ev-07 | Endpoint rechaza archivos no-imagen o que excedan 10MB en multipart               | 2026-10-17 |       | Archivo de 10MB+1KB y archivo de texto plano devuelven 400                                | 7 passed                           |        |           | host |        |        | Si se omite la validación de tamaño, payloads pesados agotan recursos del servidor      | `npx jest tests/node/api/scan-receipt-multipart.test.ts`                | observado                                 |
| ev-08 | Componentes de órdenes de pago permiten subir y revisar comprobantes de pago      | 2026-10-17 |       | ReceiptUpload valida tamaño/tipo y AdminPanel permite ver foto del comprobante            | 9 passed                           |        |           | host |        |        | Si la orden no tiene receiptUrl, el botón Ver Comprobante no se muestra                 | `npx jest tests/unit/components/payment-orders-receipt-review.test.tsx` | observado                                 |

### Hypotheses (razonado)

| Hypothesis                                                                                                                                                                                          | Probe que la asentaría |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| ~~Falta de palabras clave en category-matcher causaba mala clasificación de farmacia~~ → **RESUELTA como f-01 (fixed)**: se agregaron palabras de farmacia y se aisló la categoría hogar de compras | cubierta por ev-04     |

## Calibration history

One row per calibration run (`references/calibration.md`); never overwritten.

| Date | Skill version | K   | Found | Recall | Misses (file:line operator, why) | False positives |
| ---- | ------------- | --- | ----- | ------ | -------------------------------- | --------------- |

## Blocked by testability

| Target                                                                                                    | Rung | Why | Minimal change that opens it |
| --------------------------------------------------------------------------------------------------------- | ---- | --- | ---------------------------- |
| (ninguna — todas las superficies de fotos y facturas se probaron con mocks reproducibles en jsdom y Node) | —    | —   | —                            |

## Remaining, in order

1. Probar en dispositivo físico Android la captura directa con cámara en la app empacada Capacitor (APK).
2. Monitorear tasa de acierto de extracción OCR en facturas térmicas desgastadas mediante evals offline (`npm run eval:receipts`).
