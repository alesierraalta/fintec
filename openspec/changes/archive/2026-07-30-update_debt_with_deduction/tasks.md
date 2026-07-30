# Task Breakdown: update_debt_with_deduction

## Phase 1: Foundation (Database Migration)
- [x] Create a new migration file: `supabase/migrations/<timestamp>_add_update_debt_with_deduction.sql`
- [x] Implement the `update_debt_with_deduction` RPC in the migration file.
  - Call `update_transaction_and_adjust_balance` to update the debt itself.
  - Locate the linked expense using the tag `debt:{p_transaction_id}`.
  - Add logic to handle deduction state (`p_deduct` boolean):
    - `TRUE`: Create a linked expense if it doesn't exist, using `create_transaction_and_adjust_balance`.
    - `FALSE`: Delete the linked expense if it exists, using `delete_transaction_and_adjust_balance`.
    - `NULL` (or `TRUE` with existing expense): Update the linked expense's amount, date, description, and currency using `update_transaction_and_adjust_balance`.

## Phase 2: Core Implementation (TypeScript Repository)
- [x] Modify `repositories/supabase/transactions-repository-impl.ts` to use the new RPC for debt updates.
  - In the `update` method, add a check for `nextIsDebt === true`.
  - When `true`, call the `update_debt_with_deduction` RPC, passing all necessary transaction fields.
  - Ensure `p_deduct`, `p_source_account_id`, and `p_source_category_id` are mapped correctly from the update payload.
  - Fallback to the existing `update_transaction_and_adjust_balance` RPC for non-debt transactions.

## Phase 3: Testing
- [x] Verify creating a debt with deduction ON, then updating to deduction OFF deletes the linked expense.
- [x] Verify creating a debt with deduction OFF, then updating to deduction ON creates the linked expense.
- [x] Verify updating a debt's amount with deduction ON also updates the linked expense's amount.
- [x] Verify updating a debt's category or description propagates correctly to the linked expense when deduction is ON.
