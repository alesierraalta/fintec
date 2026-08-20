# Delta for Backend

## ADDED Requirements

### Requirement: Canonical transfer creation

The generic transaction flow MUST redirect Transfer selection to the canonical origin-to-destination flow and MUST NOT persist a lone `TRANSFER_OUT`. A canonical success SHALL atomically create exactly two rows with one `transferId` and update both balances. Feedback MUST distinguish “Transferencia creada” from “Gasto registrado”.

#### Scenario: Generic transfer selection

- GIVEN the user selects Transfer in the generic transaction flow
- WHEN the user continues or submits without a canonical pair
- THEN the canonical flow is opened or requested and no transaction row, including lone `TRANSFER_OUT`, is persisted

#### Scenario: Outcomes are paired and differentiated

- GIVEN a valid canonical transfer or an ordinary expense
- WHEN the operation succeeds
- THEN the transfer has two linked rows and both balances updated with “Transferencia creada”, while the expense shows “Gasto registrado”
- AND a failed transfer leaves no partial pair and shows an actionable error

### Requirement: Durable recurring creation and explicit first operation

Recurring creation MUST persist the rule before reporting success. The user MUST explicitly choose whether to register the first operation now. `next_execution_date` SHALL mean the next scheduled operation: after an immediate operation it MUST be later than it; otherwise it MUST identify the first scheduled occurrence. Cron MUST NOT duplicate an immediate operation. Failures MUST return Spanish, actionable feedback and MUST NOT claim success.

#### Scenario: Save recurring rule and register first operation

- GIVEN valid recurring data
- WHEN the user saves and chooses to register the first operation now
- THEN the rule is persisted before success, exactly one operation is registered, and `next_execution_date` points to a later occurrence

#### Scenario: Save recurring rule without immediate operation

- GIVEN valid recurring data
- WHEN the user saves and declines the first operation
- THEN the rule is visible as saved, `next_execution_date` identifies its first due occurrence, and cron executes it at most once when due

#### Scenario: Recurring persistence fails

- GIVEN recurring data cannot be persisted or the requested first operation fails
- WHEN the user submits it
- THEN success is not shown and the message states the failed action and a corrective next step in Spanish

### Requirement: Observed beginner acceptance per slice

Each #56, #57, and #58 slice MUST include a real observed beginner task exercising its critical path and verifying understanding.

#### Scenario: Beginner validates a slice

- GIVEN automated behavioral checks pass for the slice
- WHEN a beginner performs the critical task without expert intervention
- THEN acceptance requires a successful task and an accurate explanation of the resulting state
