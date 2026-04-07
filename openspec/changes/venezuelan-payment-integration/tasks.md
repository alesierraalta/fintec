# Tasks: Venezuelan Payment Integration (Ubii, PagoFlash, Binance Pay)

## Phase 1: Foundation & Infrastructure

- [ ] **1.1 Database Schema**: Create a new migration file `supabase/migrations/20260401124000_add_payment_method.sql` to add the `payment_method` column to the `payment_orders` table.
- [ ] **1.2 Domain Types**: Update `types/payment-order.ts` to include the `PaymentMethod` type union (`ubii`, `pagoflash`, `binance_pay`) and update `PaymentOrder` and `CreatePaymentOrderDTO` interfaces.
- [ ] **1.3 Repository Logic**: Update `repositories/supabase/payment-orders-repository-impl.ts` to include `payment_method` in the `mapSupabaseToDomain` function and the `create` method.

## Phase 2: Backend Implementation

- [ ] **2.1 Service Validation**: Update `lib/payment-orders/order-service.ts` to ensure `createOrder` validates that a valid `paymentMethod` is provided.
- [ ] **2.2 API Endpoint**: Update `app/api/payment-orders/route.ts` to extract and pass the `paymentMethod` from the request body to the service.
- [ ] **2.3 PagoFlash Client**: Create `lib/payment-orders/providers/pagoflash.ts` to implement the basic API call for initiating a payment with PagoFlash.

## Phase 3: Frontend Implementation

- [ ] **3.1 Method Selection UI**: Update `components/payment-orders/create-order-form.tsx` to include a selection (Radio Group or Select) for the three payment methods.
- [ ] **3.2 Polymorphic Instructions**: Create the following components in `components/payment-orders/methods/`:
    - `ubii-instructions.tsx` (Displaying Ubii Link)
    - `binance-instructions.tsx` (Displaying ID and QR Code)
    - `pagoflash-instructions.tsx` (Displaying API button/link)
- [ ] **3.3 Instructions Refactor**: Refactor `components/payment-orders/payment-instructions.tsx` to use the new method-specific components based on the `order.paymentMethod`.

## Phase 4: Testing & Verification

- [ ] **4.1 Logic Testing**: Write unit tests in `tests/node/lib/payment-orders/order-service.test.ts` for method validation.
- [ ] **4.2 Persistence Testing**: Update `tests/node/api/payment-orders-route.test.ts` to verify the `paymentMethod` is correctly saved and returned.
- [ ] **4.3 UI Verification**: Manually verify that each method correctly renders its instructions after a successful order creation.

## Phase 5: Cleanup & Polish

- [ ] **5.1 Configuration**: Update `.env.local.example` with the necessary keys (e.g., `NEXT_PUBLIC_UBII_LINK`, `PAGOFLASH_SECRET`).
- [ ] **5.2 Backward Compatibility**: Verify that an order with `paymentMethod = NULL` correctly defaults to showing the old bank transfer instructions.
