# Database Delta Spec: update_debt_with_deduction

## 1. RPC `update_debt_with_deduction`

### Requirements

- The database MUST define a new RPC function named `update_debt_with_deduction`.
- The RPC MUST execute all operations atomically within a single transaction.
- The RPC MUST update the target debt record with the provided updated details.
- The RPC MUST manage an associated deduction (expense) transaction linked to the debt via a tag (e.g., `debt:{debt_id}`).
- If the deduction flag is enabled (ON), the RPC MUST insert a new linked expense transaction if one does not exist, or update the existing one if details have changed.
- If the deduction flag is disabled (OFF), the RPC MUST delete any existing linked expense transaction for that debt.

### Scenarios

**Scenario: Updating debt with deduction toggled ON**
- **Given** an existing debt record without a linked expense transaction.
- **When** `update_debt_with_deduction` is called with updated debt details and deduction enabled.
- **Then** the debt record is updated.
- **And** a new expense transaction is inserted and tagged with `debt:{debt_id}`.

**Scenario: Updating debt with deduction toggled OFF**
- **Given** an existing debt record with an existing linked expense transaction.
- **When** `update_debt_with_deduction` is called with updated debt details and deduction disabled.
- **Then** the debt record is updated.
- **And** the existing linked expense transaction is deleted.

**Scenario: Updating debt details with deduction kept ON**
- **Given** an existing debt record with an existing linked expense transaction.
- **When** `update_debt_with_deduction` is called with updated debt details (e.g., amount changed) and deduction enabled.
- **Then** the debt record is updated.
- **And** the existing linked expense transaction is updated to reflect the new amount/details.

**Scenario: Failure during operation**
- **Given** an existing debt record.
- **When** `update_debt_with_deduction` is called but an error occurs (e.g., invalid constraints or missing account).
- **Then** the transaction is rolled back.
- **And** neither the debt record nor the transaction records are modified.
