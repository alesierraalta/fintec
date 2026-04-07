# Proposal: Debts Management Actions

## Intent

The `/debts` page is currently read-only — users can view debts but cannot create, settle, edit, or delete them. This forces users to navigate back to the transaction flow to manage debts, creating friction and breaking the mental model of a dedicated debts workspace. We need full CRUD actions on the debts page so users can manage their obligations without context-switching.

## Scope

### In Scope

- **Quick-settle button** on each OPEN debt card (one-click Mark as Settled)
- **Edit debt** via existing TransactionForm in edit mode
- **Create debt** from a "New Debt" button on the debts page
- **Delete debt** with confirmation dialog
- Balance adjustment on settle (net-zero operation)

### Out of Scope

- Partial settlements / installment tracking
- Interest calculations or due dates
- Notifications/reminders for overdue debts
- Debt-to-debt transfers or consolidation
- Bulk operations (settle all, delete all)

## Approach

Phased delivery, each phase independently shippable:

**Phase 1 — Quick-Settle Button** (highest value, lowest risk)

- Add "Settle" action button on each OPEN debt card
- On click: update `debtStatus` to `SETTLED`, set `settledAt` to now, call existing PUT API
- No balance impact (debt already counted in cashflow)
- Optimistic UI update with rollback on error

**Phase 2 — Edit Debt**

- Add "Edit" action to debt cards
- Reuse `TransactionForm` with `transaction` prop (already supports edit mode with all debt fields)
- Call existing PUT `/api/transactions` endpoint
- Validate: `isDebt: true` preserved, `debtDirection` required

**Phase 3 — Create Debt**

- Add "New Debt" button on debts page header
- Open TransactionForm in create mode, pre-fill `isDebt: true`
- User selects direction (`OWE` / `OWED_TO_ME`), amount, counterparty
- Call existing POST `/api/transactions` endpoint

**Phase 4 — Delete Debt**

- Add "Delete" action to debt cards
- Confirmation dialog with debt details
- Call existing DELETE `/api/transactions?id=xxx` endpoint
- No balance adjustment needed (debt metadata removal only)

## Affected Areas

| Area                                    | Impact    | Description                              |
| --------------------------------------- | --------- | ---------------------------------------- |
| `app/debts/page.tsx`                    | Modified  | Add Create button, action menu per card  |
| `components/debts/`                     | Modified  | Settle/Edit/Delete actions on debt cards |
| `components/forms/transaction-form.tsx` | Reused    | Edit mode already supports debt fields   |
| `hooks/use-transaction-form.ts`         | Modified  | Debt-specific prefill/validation         |
| `api/transactions`                      | No change | PUT/DELETE endpoints already exist       |
| `repositories/`                         | No change | Update mechanism already implemented     |

## Risks

| Risk                                                | Likelihood | Mitigation                                                    |
| --------------------------------------------------- | ---------- | ------------------------------------------------------------- |
| Settled debt accidentally double-counted in balance | Low        | Settle is status-only change; no new transaction created      |
| Edit form loses debt metadata                       | Low        | TransactionForm preserves `isDebt` flag; add validation guard |
| Delete removes transaction affecting balance        | Medium     | Confirm dialog warns about impact; consider soft-delete first |
| Race condition on quick-settle                      | Low        | Optimistic update with server confirmation rollback           |

## Rollback Plan

1. Remove action buttons from debt cards (UI-only revert)
2. If any repository changes made, revert to prior commit
3. No database schema changes required — fully reversible at code level
4. Verify debts page renders read-only as before

## Dependencies

- Existing TransactionForm with edit mode (already implemented)
- Existing PUT/DELETE transaction API endpoints (already implemented)
- Repository update mechanism (already implemented)

## Success Criteria

- [ ] User can settle an OPEN debt with one click from the debts page
- [ ] User can edit debt details (amount, counterparty, direction) via TransactionForm
- [ ] User can create a new debt directly from the debts page
- [ ] User can delete a debt with confirmation
- [ ] Settled debts show `settledAt` timestamp and are excluded from OPEN totals
- [ ] All actions work with both local (Dexie) and remote (Supabase) repositories
- [ ] No regression in existing read-only debt display or directional totals
