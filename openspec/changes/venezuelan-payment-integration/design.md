# Design: Venezuelan Payment Integration (Ubii, PagoFlash, Binance Pay)

## Technical Approach

We will extend the existing `payment-orders` infrastructure to support multiple payment methods. The core change involves adding a `payment_method` field to the database and domain types. This field will drive the "Instructions" UI, allowing us to show different steps, credentials, and interactive elements (like API buttons) depending on whether the user chose Ubii, PagoFlash, or Binance Pay.

## Architecture Decisions

### Decision: Database Schema Extension
**Choice**: Add a `payment_method` column (TEXT) to the `payment_orders` table.
**Alternatives considered**: Creating a separate table for method-specific metadata.
**Rationale**: A single column is sufficient since we mostly need it for routing the instructions UI and for administrative audit. It avoids unnecessary joins and complexity.

### Decision: Polymorphic Instruction Rendering
**Choice**: Refactor `PaymentInstructions` to use a strategy pattern or simple switch/case that delegates rendering to method-specific sub-components.
**Alternatives considered**: Massive conditional blocks inside a single file.
**Rationale**: Improved maintainability and separation of concerns. Each payment provider's specific UI (like QR codes for Binance or Links for Ubii) can be managed independently.

### Decision: Ubii "No-Code" Approach
**Choice**: For Ubii, we will only display the "Ubii Link" provided in the environment/configuration.
**Alternatives considered**: Integrating the Ubii API.
**Rationale**: The user explicitly requested to avoid Ubii API code for professional accounts.

## Data Flow

1. **Creation**: User chooses a method in `CreateOrderForm`. The `payment_method` is sent in the POST request.
2. **Persistence**: `createOrder` service validates the method and saves it to Supabase via `SupabasePaymentOrdersRepository`.
3. **Delivery**: When the user views the order, `PaymentInstructions` reads the `payment_method` and displays the corresponding credentials (QR, Link, or API button).
4. **Verification**: User performs payment outside (Ubii/Binance) or inside (PagoFlash) and uploads a receipt.
5. **Approval**: Admin reviews the receipt, seeing which method was selected to facilitate cross-referencing with their own wallets.

## File Changes

| File | Action | Description |
| ---- | ------ | ----------- |
| `supabase/migrations/20240401_add_payment_method.sql` | Create | Schema update: `ALTER TABLE payment_orders ADD COLUMN payment_method TEXT;` |
| `types/payment-order.ts` | Modify | Add `PaymentMethod` type union and update `PaymentOrder` interface. |
| `repositories/supabase/payment-orders-repository-impl.ts` | Modify | Update mapping logic and `create`/`list` operations. |
| `lib/payment-orders/order-service.ts` | Modify | Add validation for `payment_method` during creation. |
| `app/api/payment-orders/route.ts` | Modify | Handle the new field in the POST request body. |
| `components/payment-orders/create-order-form.tsx` | Modify | Add selection UI for the three methods. |
| `components/payment-orders/payment-instructions.tsx` | Modify | Refactor to show dynamic instructions per method. |
| `components/payment-orders/methods/UbiiInstructions.tsx` | Create | Specific UI for Ubii Link flow. |
| `components/payment-orders/methods/BinanceInstructions.tsx` | Create | Specific UI for Binance ID/QR flow. |
| `components/payment-orders/methods/PagoFlashInstructions.tsx` | Create | Specific UI for PagoFlash API/Link flow. |

## Interfaces / Contracts

```typescript
// types/payment-order.ts
export type PaymentMethod = 'ubii' | 'pagoflash' | 'binance_pay';

export interface PaymentOrder {
  // ... existing fields
  paymentMethod?: PaymentMethod;
}

export interface CreatePaymentOrderDTO {
  // ... existing fields
  paymentMethod: PaymentMethod;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
| ----- | ------------ | -------- |
| Unit | `order-service.ts` | Verify that `paymentMethod` is mandatory and validated. |
| Integration | `payment-orders-repository` | Verify that the `payment_method` is correctly persisted and retrieved from Supabase. |
| E2E | Payment Flow | Use Playwright to simulate creating an order with each method and verifying the instructions change. |

## Migration / Rollout

A SQL migration adds the `payment_method` column. Pre-existing orders will have a `NULL` value. The `PaymentInstructions` component will handle `NULL` by defaulting to the legacy "Mercantil Banco" manual instructions to ensure backward compatibility.

## Open Questions

- [ ] **USDT Rate**: For Binance Pay, how should we calculate the USDT amount to show? (Static rate for now, or fetch from P2P API later).
- [ ] **PagoFlash API**: Does the user have the API keys ready in `.env`?
