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

- T1 S1-S2 reconciliation domain helper + modal + accounts entry point — inline — commit: 6f14f0b0
- T2 S3 quick-entry parser + modal + transactions entry point — inline — commit: 6f14f0b0
- T3 S4 CSV statement parser/mapper + import modal + transactions entry point — inline — commit: pending
- T4 verify: unit tests, type-check, lint — inline — commit: pending

## Log

- L1 (user, original): "Necesito encontrar una forma en la cual yo pueda mejorar la fricción. No sé si, si simplemente poner un historial de gastos, así sea para simplemente convalidar las cuentas de cuánto dinero tengo, indistintamente de en qué me lo gasté. [...] llevo como dos meses que no lo utilizo porque hay mucha fricción. [...] hago muchos gastos pequeños. [...] qué otra forma yo puedo hacer para quitar fricción a lotes grandes de gastos para, para la aplicación."
- L2 (user): "hazlo todo y que cuente como estadistica"
- L3 (decision): branched from feat/landing-backlog-t2-t4 HEAD (dirty globals.css blocks switching from main); reuse runFinancialMutation + repository.transactions.create; no migration.
