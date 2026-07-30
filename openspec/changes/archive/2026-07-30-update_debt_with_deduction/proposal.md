# Proposal: update_debt_with_deduction

## Intent
Add functionality to safely update a debt record and manage an associated deduction (expense) transaction atomically.

## Scope
- Create a new Supabase RPC `update_debt_with_deduction` to handle the debt update and the associated linked expense transaction (tagged with `debt:{debt_id}`).
- Update `repositories/supabase/transactions-repository-impl.ts` (or the relevant repository handling debts/transactions) to use the new RPC for updating debts.

## Approach
Create a dedicated RPC `update_debt_with_deduction` to handle the updating of debts that may involve deducting from a source account. It should manage the linked expense transaction (tagged with `debt:{debt_id}`) atomically:
- Inserting it if deduction is toggled on
- Updating it if details change
- Deleting it if deduction is toggled off
Also, `repositories/supabase/transactions-repository-impl.ts` should be updated to route debt updates to this new RPC instead of the generic one.

## Affected Areas
- Database: New RPC `update_debt_with_deduction`.
- Backend/Repository: `repositories/supabase/transactions-repository-impl.ts`.

## Dependencies
- Supabase database schema and migrations.
- Existing debt and transaction tables.

## Risks
- Incorrect transaction handling could lead to orphaned expense transactions or missing deductions.
- RPC execution failure could leave the database in an inconsistent state if not properly wrapped in a transaction.

## Rollback Plan
- Revert the backend changes in `repositories/supabase/transactions-repository-impl.ts` to use the previous update logic.
- Drop the new RPC `update_debt_with_deduction` from the database.

## Success Criteria
- Updating a debt with deduction enabled successfully creates or updates the linked expense transaction.
- Updating a debt with deduction disabled successfully deletes any existing linked expense transaction.
- The debt record itself is updated correctly.
- These operations occur atomically.
