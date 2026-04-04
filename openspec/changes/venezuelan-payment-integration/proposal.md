# Proposal: Venezuelan Payment Integration (Ubii, PagoFlash, Binance Pay)

## Intent

The current payment system only supports manual bank transfers to a single hardcoded account (Mercantil Banco). This project needs to support common Venezuelan payment methods to improve user experience and automation for individual professionals (personas naturales).

## Scope

### In Scope

- **Database**: Add `payment_method` field to `payment_orders` table.
- **Domain Types**: Update `PaymentOrder` and `CreatePaymentOrderDTO` to include `paymentMethod`.
- **UI (Create)**: Add a selection dropdown/radio for payment methods in `CreateOrderForm`.
- **UI (Instructions)**: Refactor `PaymentInstructions` to show method-specific details:
    - **Ubii**: Display "Ubii Link" for professional account.
    - **PagoFlash**: Basic API integration for processing.
    - **Binance Pay**: Display Binance ID and static QR code.
- **Backend**: Update `order-service` and API routes to handle and validate the selected method.

### Out of Scope

- **Advanced Automation**: Auto-confirming Binance transactions via API (deferred to future work).
- **Admin Flow Changes**: The logic for manual approval of uploaded receipts remains unchanged for now.
- **Multiple Currencies per Order**: Orders remain in `VES` (Binance will show conversion to USDT but the order amount stays in VES).

## Approach

A modular approach will be used. We'll add a `payment_method` column to the `payment_orders` table. The frontend will be updated to allow users to choose their preferred method during order creation. `PaymentInstructions` will then use a switch/case logic to render the appropriate steps and credentials for the selected method. 

For Ubii, we avoid API code as requested and use the "Ubii Link" provided by the user. For PagoFlash, we'll implement the basic API flow for individuals. For Binance, we'll use a manual verification flow with a static QR/ID.

## Affected Areas

| Area | Impact | Description |
| ---- | ------ | ----------- |
| `types/payment-order.ts` | Modified | Add `paymentMethod` to domain/DTO types. |
| `repositories/supabase/types.ts` | Modified | Update SQL schema and table types. |
| `repositories/supabase/payment-orders-repository-impl.ts` | Modified | Store/Retrieve `payment_method`. |
| `components/payment-orders/create-order-form.tsx` | Modified | Method selection UI. |
| `components/payment-orders/payment-instructions.tsx` | Modified | Dynamic instructions per method. |
| `lib/payment-orders/order-service.ts` | Modified | Logic to handle payment method. |
| `app/api/payment-orders/route.ts` | Modified | API validation for the new field. |
| `supabase/migrations/...` | New | SQL migration to add the column. |

## Risks

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| API Key Disclosure | Medium | Store PagoFlash keys in Supabase Vault or server-side env vars. |
| Manual Receipt Forgery | Low | Admins must manually verify transactions before approval. |
| Method Mismatch | Medium | Validation in instructions to remind users which method was selected. |

## Rollback Plan

Revert the database migration (drop `payment_method` column) and revert the UI changes to the hardcoded Mercantil Banco instructions.

## Dependencies

- User must provide:
    - Ubii Link (Professional).
    - PagoFlash API Credentials.
    - Binance ID and QR Code image.

## Success Criteria

- [ ] Users can select between Ubii, PagoFlash, and Binance Pay when creating an order.
- [ ] The selected method is persisted in the database.
- [ ] Instructions correctly display the appropriate payment details for the chosen method.
- [ ] Admins can see which method was used when reviewing an order.
