# Technical Design: update_debt_with_deduction

## 1. Overview
The goal is to provide a safe, atomic mechanism for updating debts that may have an associated linked expense (deduction). This ensures that if a debt is updated, the linked expense is also appropriately updated (e.g., amount changes), created, or deleted based on whether the deduction is toggled on or off.

## 2. Architecture Decisions
- **RPC for Atomicity**: Like `create_debt_with_deduction`, we will handle the complex logic of balancing and linking inside a dedicated Supabase RPC (`update_debt_with_deduction`). This prevents edge cases where the backend fails between updating the debt and its linked expense.
- **Deduction Status Resolution**: The RPC will accept a `p_deduct` boolean. 
  - `TRUE`: Ensure linked expense exists and is updated.
  - `FALSE`: Ensure linked expense is deleted.
  - `NULL`: Keep the current presence state (but still sync fields like amount, date, description if it exists).
- **Graceful Fallbacks**: The frontend form submission might not supply all deduction fields on every partial update. The RPC will gracefully sync existing expenses using their current account and category if omitted.

## 3. Database Changes (Migrations)
Create a new migration file: `supabase/migrations/[timestamp]_add_update_debt_with_deduction.sql`.

### RPC Signature & Logic:
```sql
CREATE OR REPLACE FUNCTION public.update_debt_with_deduction(
  p_transaction_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_type text,
  p_currency_code text,
  p_amount_minor bigint,
  p_amount_base_minor bigint,
  p_exchange_rate numeric,
  p_date date,
  p_description text,
  p_note text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_debt_direction public.debt_direction DEFAULT NULL,
  p_debt_status public.debt_status DEFAULT NULL,
  p_counterparty_name text DEFAULT NULL,
  p_settled_at timestamptz DEFAULT NULL,
  p_deduct boolean DEFAULT NULL,
  p_source_account_id uuid DEFAULT NULL,
  p_source_category_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
```

**Implementation Steps:**
1. Call `update_transaction_and_adjust_balance` to update the debt itself.
2. Locate the linked expense by searching for the tag `debt:{p_transaction_id}`.
3. Handle Deduction State:
   - If `p_deduct IS TRUE` and no linked expense exists: Call `create_transaction_and_adjust_balance` to generate one.
   - If `p_deduct IS FALSE` and a linked expense exists: Call `delete_transaction_and_adjust_balance` to remove it.
   - If a linked expense should exist (either `p_deduct IS TRUE` or `p_deduct IS NULL` + expense exists): Call `update_transaction_and_adjust_balance` to sync the linked expense's amount, date, description, and currency, using `p_source_account_id` and `p_source_category_id` if provided (coalescing with its existing values otherwise).
4. Return a JSON object with the debt ID and the linked expense ID (if any).

## 4. Backend File Changes
### `repositories/supabase/transactions-repository-impl.ts`
Modify the `update(id, updates)` method. 
Currently, it blindly calls `update_transaction_and_adjust_balance`. We will introduce a branch:
```typescript
if (nextIsDebt === true) {
  // Use the new RPC to handle debt + linked expense atomicity
  const { data, error } = await (this.client as any).rpc(
    'update_debt_with_deduction',
    {
      p_transaction_id: id,
      p_account_id: accountId,
      // ... all standard transaction fields
      p_deduct: updateData.deductFromAccount ?? null,
      p_source_account_id: updateData.sourceAccountId ?? null,
      p_source_category_id: updateData.categoryId !== undefined ? updateData.categoryId : (originalTransaction.categoryId ?? null),
    }
  );
  // handle error & return mapped domain model
} else {
  // Existing update_transaction_and_adjust_balance call for non-debts
}
```

## 5. Data Flow
1. **Client**: Submits a `PATCH` request to update a debt transaction, potentially including `deductFromAccount` and `sourceAccountId`.
2. **Repository**: Routes the call to `update_debt_with_deduction` RPC.
3. **RPC**: Updates the metadata debt record.
4. **RPC**: Finds the linked deduction.
5. **RPC**: Synchronizes, creates, or deletes the linked deduction based on `p_deduct` and matching tags.
6. **Repository**: Returns the updated mapped domain `Transaction` (the metadata debt row).

## 6. Testing Strategy
- **Create a Debt (Deduction ON) -> Update to Deduction OFF**: Verify the linked expense is deleted.
- **Create a Debt (Deduction OFF) -> Update to Deduction ON**: Verify the linked expense is created.
- **Update Debt Amount (Deduction ON)**: Verify the linked expense's amount updates concurrently.
- **Update Debt Category/Description**: Verify these changes propagate or ignore the linked expense appropriately as dictated by the RPC.

## 7. Rollback Plan
- Drop the RPC `update_debt_with_deduction`.
- Revert `transactions-repository-impl.ts` to strictly route all updates through `update_transaction_and_adjust_balance`.
