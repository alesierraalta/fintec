## Exploration: Venezuelan Payment Integration

### Current State

The system has a `payment-orders` module that currently handles manual transfers for "Mercantil Banco" (hardcoded). It allows users to:
1. Create an order (amount + description).
2. See instructions (hardcoded).
3. Upload a receipt image.
4. Admins approve/reject.

The `PaymentOrder` domain type and database table lack a `payment_method` field, which is necessary to support multiple providers with different flows.

### Affected Areas

- `types/payment-order.ts` — Add `paymentMethod` to the domain and DTO types.
- `repositories/supabase/types.ts` — Update the SQL schema and types for the `payment_orders` table.
- `repositories/supabase/payment-orders-repository-impl.ts` — Update repository logic to handle the new field.
- `components/payment-orders/create-order-form.tsx` — Add a selection for the payment method.
- `components/payment-orders/payment-instructions.tsx` — Transform into a dynamic component that shows instructions based on the selected method.
- `lib/payment-orders/order-service.ts` — Update business logic to validate and store the method.
- `app/api/payment-orders/route.ts` — Update the API endpoint to handle the new field.

### Approaches

1. **Ubii Link (Semi-Automated)**
   - **Description**: The user selects Ubii. The app displays the "Ubii Link" for the user's professional profile. The user pays on Ubii and returns to upload the receipt.
   - **Pros**: Complies with the user's "no code Ubii API" requirement for professional accounts.
   - **Cons**: Manual receipt upload still required.
   - **Effort**: Low.

2. **PagoFlash (API Integration)**
   - **Description**: The user selects PagoFlash. The app integrates with the PagoFlash API (Natural Person Commerce) to initiate the payment.
   - **Pros**: Higher automation potential; easier for individual professionals to get started.
   - **Cons**: Requires handling API responses and potential webhooks.
   - **Effort**: Medium.

3. **Binance Pay (Manual Verification)**
   - **Description**: The user selects Binance Pay. Shows the user a static QR or Binance ID to pay in USDT. User uploads a screenshot.
   - **Pros**: Best for maintaining value (USDT).
   - **Cons**: Entirely manual verification by the admin.
   - **Effort**: Low (Manual) to Medium (Custom Bot later).

### Recommendation

Implement a modular payment method system. We will add a `payment_method` field to the `payment_orders` table and update the UI to allow selecting between:
- **Ubii (Link)**
- **PagoFlash (API)**
- **Binance Pay (Manual)**

We will prioritize the UI/UX for these 3 methods, ensuring clear instructions for each. For Ubii, we will use the "Ubii Link" approach as requested. For PagoFlash, we'll implement the basic API flow for individuals.

### Risks

- **KYC/API Access**: Ensuring the user has the correct keys/profile for PagoFlash.
- **Verification Latency**: Manual confirmation for Binance/Ubii might delay user access.
- **USDT/VES Rate**: For Binance Pay, we need to handle the conversion if the order is in VES but payment is in USDT.

### Ready for Proposal

Yes. I have a clear plan to integrate the three requested methods while respecting the "no Ubii API code" constraint for professional accounts.
