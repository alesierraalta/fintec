# Low-friction capture

Reduce the cost of catching up after weeks without logging: reconcile balances in one step,
log many small expenses at once, and import bank statements in bulk. No schema changes.

## Specs

- S1 Reconcile balance: from an account, the user types the real current balance; the app creates ONE transaction for the difference (EXPENSE when real < recorded, INCOME when real > recorded, nothing when equal) so the recorded balance matches. User: "simplemente poner un historial de gastos, así sea para simplemente convalidar las cuentas de cuánto dinero tengo, indistintamente de en qué me lo gasté".
- S2 The reconciliation transaction counts in statistics: "que cuente como estadistica". It is a normal INCOME/EXPENSE (no exclusion flag), identifiable by description and tag.
- S3 Quick multi-entry: many small expenses entered in one text box (e.g. "café 2, taxi 5"), previewed, then saved together to one account. User: "hago muchos gastos pequeños... no voy a estar dos horas registrando los gastos".
- S4 Statement import: upload a bank CSV, map date/description/amount columns, preview rows with duplicate warnings, select and import in bulk. User: "quitar fricción a lotes grandes de gastos".
- S5 User request scope: "hazlo todo" (S1 + S3 + S4).

## Tasks

- T0 S1-S4 pure domain: `lib/finance/reconciliation.ts`, `lib/finance/quick-entry.ts`, `lib/finance/statement-import.ts` + `tests/node/lib/finance/low-friction-capture.test.ts` (31 tests GREEN) — inline — commit: `3253de1b` (feat(finance): add low-friction capture domain)
- T1 S1-S2 `components/bulk-capture/reconcile-balance-modal.tsx` + entry "Conciliar saldo" in the account dropdown of `app/accounts/accounts-page-client.tsx` — complete
- T2 S3 `components/bulk-capture/quick-entry-modal.tsx` + menu option "Registro rápido" — complete
- T3 S4 `components/bulk-capture/statement-import-modal.tsx` + menu option "Importar extracto" — complete
- T4 verify: unit tests (48 tests passing across 3 suites), type-check (0 errors), lint clean — complete

## UI contract (T1-T3)

- All saves go through `runFinancialMutation({ userId, repository, domains: ['transactions','accounts','budgets'], mutation })` calling `repository.transactions.create(dto)` sequentially (pattern: `components/receipts/batch-receipt-uploader-modal.tsx` handleBatchSubmit). VES accounts pass `exchangeRate: useActiveUsdVesRate()`; refuse to save VES when rate <= 0 with the same message as `hooks/use-transaction-form.ts`.
- Shared save helper lives in `components/bulk-capture/save-transactions.ts` (one place for the loop + VES guard + partial-failure report: on error stop and toast how many were saved).
- Reconcile modal: shows recorded balance, input "Saldo real hoy" parsed with `parseAmountInput` -> `toMinorUnits`, date (default today), live preview of difference ("Se registrará un gasto de X" / "ingreso de X" / "Tu saldo ya cuadra"), optional category select (expense or income categories by resulting type), confirm creates `buildReconciliationTransaction` result (with chosen categoryId).
- Quick entry modal: textarea (placeholder "café 2, taxi 5\nalmuerzo 12"), account select, date (default today), category select (optional, EXPENSE kind) applied to all, live preview list from `parseQuickEntries` with total and invalid segments listed; saves EXPENSE rows tagged `registro-rapido`.
- Statement import modal: file input (.csv,text/csv), `parseCsv`, header checkbox (default on), column selects prefilled by `guessColumnMapping`, "Invertir signo" toggle, account select, preview table from `mapStatementRows` with per-row checkbox (default checked, unchecked when `detectHistoryDuplicate` flags it, showing reason), count of invalid rows; saves rows tagged `extracto`, note `Ref: <reference>` when present.
- `components/transactions/add-transaction-menu.tsx`: add `onQuickEntry` and `onImportStatement` props; defaults route to `/transactions?action=quick` and `/transactions?action=import`; show both options in desktop popover and mobile sheet. `app/transactions/transactions-page-client.tsx` opens the matching modal from those callbacks and from `?action=quick|import` (mirror the existing `action=batch` handling).
- UI copy in Spanish (existing app convention); code identifiers in English.

## Log

- L1 (user, original): "Necesito encontrar una forma en la cual yo pueda mejorar la fricción. No sé si, si simplemente poner un historial de gastos, así sea para simplemente convalidar las cuentas de cuánto dinero tengo, indistintamente de en qué me lo gasté. [...] llevo como dos meses que no lo utilizo porque hay mucha fricción. [...] hago muchos gastos pequeños. [...] qué otra forma yo puedo hacer para quitar fricción a lotes grandes de gastos para, para la aplicación."
- L2 (user): "hazlo todo y que cuente como estadistica"
- L3 (decision): branched from feat/landing-backlog-t2-t4 HEAD (dirty globals.css blocks switching from main); reuse runFinancialMutation + repository.transactions.create; no migration.
