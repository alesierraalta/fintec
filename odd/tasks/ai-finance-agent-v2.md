# AI Finance Agent v2

Milestone "AI Finance Agent v2" (#113-#118, plus #61 and #44). Rebuild the AI chat agent so expenses,
income and transfers land in the right category and account, with an evaluation dataset, deferred
receipt matching and a redesigned chat.

## Specs

- S1 (#113): "cuando le pido que me haga gastos o ingresos, todos los manda a carros". Chat-created
  expenses and income resolve to the correct category among default and user categories of the same
  kind; when no category can be resolved confidently the agent asks instead of silently falling back.
- S2 (#114): "cuando le dije que quería hacer una transferencia me lo registró como gasto. U me gastó
  como siete mil dólares una cosa así de la cuenta normal mía". A transfer request moves money between
  the user's own accounts and never records an expense.
- S3 (#114): "arreglar esa sección de mi cuenta para yo no tener que volver. hacer una convalidación
  de cuánto dinero tengo". A mis-recorded expense can be converted into a transfer so balances are
  repaired without a manual reconciliation.
- S4 (#115): "reiniciar la arquitectura que tenemos actualmente porque es bastante mala ... ver si se
  hace por tools o si se hace por grafos, si hay que hacer los embeddings, si hay que armar el sistema
  de RAG". One tool-calling agent with id-based tools, injected user context and one resolver shared by
  chat, voice and receipts; decision recorded.
- S5 (#116): "armes un dataset muy grande para poder probar cómo va funcionando todo el flujo y
  arquitectura". Large labeled dataset plus an eval runner reporting accuracy per intent and category.
- S6 (#117): "hice tantos gastos, pero sin yo decirle cuánto, y que luego me manda una pestaña donde
  donde yo le pegue las fotos de los tickets o facturas o de lo que sea, y que él detecte cuál es
  cuál". Pending expenses persist in the database (user decision: "si" to storing them as pending)
  and receipt photos are matched to them.
- S7 (#118, #61, #44): "rehagas el diseño del chat, que la verdad es que es bastante vago". Redesigned
  chat with cards, confirmation and the receipt panel.

## Tasks

- T1 [S1] #113 inline — category resolution fix + categories in the system prompt — done, commit: 05495755
- T2 [S2,S3] #114 — createTransfer tool, intent routing, reclassify expense as transfer — done, commits: 6992b985, 0a9aeec1, review fixes (see L6-L7)
- T3 [S4] #115 — architecture v2, shared resolver, embeddings kNN layer — commit: pending
- T4 [S5] #116 — evaluation dataset and runner — done (474 cases, keyword resolver alone 46.2%)
- T5 [S6] #117 — deferred expenses and receipt matching — commit: pending
- T6 [S7] #118 — chat redesign — commit: pending

## Log

- L1 (user): "Necesito optimizar y mejorar el formato, o sea, no el formato, la estructura que
  proveemos de AI, porque cuando le pido que me haga gastos o ingresos, todos los manda a carros. Así
  que necesito que hagas varias cosas. Primero, armar o sea, reiniciar la arquitectura que tenemos
  actualmente porque es bastante mala. Necesito que también armes un dataset muy grande para poder
  probar cómo va funcionando todo el flujo y arquitectura, y rehagas el diseño del chat, que la verdad
  es que es bastante vago. Entonces, necesito que vayas implementando todo el ecosistema de
  inteligencia artificial, tanto las tools, ver si se hace por tools o si se hace por grafos, si hay
  que hacer los embeddings, si hay que armar el sistema de RAG para que agarre los datos, para que
  pueda luego hacer las tools, todo ese sistema. Y además, quisiera yo poder decirle, por ejemplo,
  mira, hice tantos gastos, pero sin yo decirle cuánto, y que luego me manda una pestaña donde donde
  yo le pegue las fotos de los tickets o facturas o de lo que sea, y que él detecte cuál es cuál."
- L2 (user): "si, ademas: ... cuando le dije que quería hacer una transferencia me lo registró como
  gasto. U me gastó como siete mil dólares una cosa así de la cuenta normal mía Entonces, bueno. De
  paso tenemos que volver a arreglar esa sección de mi cuenta para yo no tener que volver. hacer una
  convalidación de cuánto dinero tengo, etcétera, etcétera etcétera"
- L3 (evidence): root cause of S1 in `lib/ai/tools/resolvers.ts` createTransaction: categories filtered
  by `userId === ctx.userId` drop defaults (`user_id NULL`); the prompt lists no categories; fallback is
  `userCategories[0]`; kind is ignored. Root cause of S2: the chat has no transfer tool.
- L4 (decision): tool-calling agent (AI SDK) over a graph framework; production data is not edited
  directly, S3 is delivered as an in-app conversion action.
- L5 (evidence, T4): deterministic eval on 474 cases: the keyword resolver alone (no model hint)
  is right in 46.2% of 286 create cases, asks in 62 and guesses wrong in ~92 (e.g. "la compra del
  abasto" -> Compras). T3 must make the fallback ask rather than guess wrong; live mode measures the
  real agent (`npm run eval:agent:live`).
- L6 (evidence, T2): scratch Postgres (baseline + all migrations, role authenticated): foreign
  user, income, foreign destination (rollback, expense kept), owner 7000 USD conversion (source
  unchanged, destination +700000, TRANSFER_OUT/IN with original date), double conversion and anon
  all behave as specified. Independent verify then found: debt-linked expenses convertible and
  delete cascade over debt:<id> rows (could delete >1 row), cross-currency RPC default rate 1,
  candidate search limited to 200 rows, BTC/ETH decimal mismatch inherited from create_transfer.
  Fixed: RPC rejects debt-linked/debt-parent expenses, requires a rate across currencies, blocks
  BTC/ETH; resolver paginates all expenses and skips debt-linked rows. Reproduced RED then GREEN
  on the scratch DB and in unit tests. Found #119 (transfer delete RPC argument name).
- L7 (evidence, live eval on the real model, quota-limited sample): transfers 10/10 correct and
  never recorded as expenses; expense category 7/8; income accountName dropped 3/5; "anota 20" /
  "gasté 30" filed under Otros Gastos instead of asking; Yummy filed as food. Prompt rules added
  for all three; re-measure when the provider quota resets (most runs failed with quota errors).
