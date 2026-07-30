# Backend Delta Spec: update_debt_with_deduction

## 1. Transactions Repository Update

### Requirements

- The `transactions-repository-impl.ts` (or the specific repository managing debts) MUST route debt update operations to the new `update_debt_with_deduction` RPC.
- The repository MUST correctly map domain models (debt details, deduction flag) to the expected RPC parameters.
- The repository MUST handle RPC errors gracefully, returning appropriate failure responses to the caller.

### Scenarios

**Scenario: Successful debt update via RPC**
- **Given** a valid debt update request with deduction parameters.
- **When** the repository's debt update method is invoked.
- **Then** it MUST call the `update_debt_with_deduction` RPC with the correctly mapped parameters.
- **And** return a successful response upon completion.

**Scenario: RPC invocation failure**
- **Given** a debt update request.
- **When** the repository calls `update_debt_with_deduction` and the RPC returns an error.
- **Then** the repository MUST catch the error and return an appropriate failure domain model or throw a structured exception.
