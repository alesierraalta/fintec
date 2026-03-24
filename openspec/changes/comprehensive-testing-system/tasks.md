# Tasks: Comprehensive Testing System (Total Coverage)

## Phase 1: Utility & Hook Coverage (Atoms)

- [ ] 1.1 Create `tests/unit/lib/dates.test.ts` to cover `lib/dates.ts` ensuring >90% coverage
- [ ] 1.2 Create `tests/unit/lib/csv.test.ts` to cover `lib/csv.ts` ensuring >90% coverage
- [ ] 1.3 Create `tests/unit/lib/money.test.ts` to cover `lib/money.ts` ensuring >90% coverage
- [ ] 1.4 Create `tests/unit/hooks/use-transaction-form.test.ts` to cover `hooks/use-transaction-form.ts` ensuring >90% coverage

## Phase 2: Repository Parity (Contract Testing)

- [ ] 2.1 Refactor/Create `tests/integration/repositories/contract.test.ts` to define shared tests
- [ ] 2.2 Implement tests for `repositories/supabase/transactions-repository-impl.ts` against the contract
- [ ] 2.3 Implement tests for `repositories/local/transactions-repository-impl.ts` (Dexie) against the contract to ensure 100% parity

## Phase 3: Component & Flow Integration

- [ ] 3.1 Create `tests/components/period-selector.test.tsx` for `period-selector.tsx` filters
- [ ] 3.2 Create `tests/components/transaction-detail-panel.test.tsx` for `transaction-detail-panel.tsx`
- [ ] 3.3 Create `tests/integration/transfer-wizard.test.tsx` for Transfer wizard coordination (mobile/desktop)

## Phase 4: Mutation & Strategy

- [ ] 4.1 Update Stryker configuration (`stryker.conf.js`) to include business logic layers (lib, hooks, repositories)
- [ ] 4.2 Run mutation testing and fix any killed mutants in business logic layers.
