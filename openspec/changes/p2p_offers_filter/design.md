# Technical Design: P2P Offers Filter

## 1. Architecture Decisions

*   **Client-Side Filtering:** The `p2p-offers-filter.tsx` component will be a Next.js Client Component (`"use client"`), as it requires interactive user input (amount, payment method, buy/sell toggle) and triggers state changes that refetch data via the `useBinanceP2POffers` hook.
*   **Separation of Concerns:**
    *   `app/(public)/p2p-offers/page.tsx`: Server Component that acts as the entry point and layout wrapper for the route.
    *   `components/p2p-offers-filter.tsx`: Client Component containing the form elements and managing local filter state.
    *   `useBinanceP2POffers`: Data fetching hook encapsulating the logic to interact with the Binance P2P API.
*   **Error and Empty States:** We will implement explicit UI states for loading, empty results, and errors (such as API rate limits).

## 2. Data Flow

1.  **User Input:** The user navigates to `/p2p-offers` and interacts with the form elements in `P2POffersFilter` (selects Buy/Sell, inputs VES amount, selects payment method).
2.  **State Update:** The component's local state is updated with the new filter values.
3.  **Data Fetching:** The `useBinanceP2POffers` hook is triggered with the updated parameters (`tradeType` (BUY/SELL), `fiat` (VES), `asset` (USDT), `payTypes`, `transAmount`).
4.  **Pending State:** The UI displays a loading indicator while the hook awaits a response.
5.  **Response Handling:**
    *   *Success (with data):* The hook returns a list of offers. The UI updates to render the offers (advertiser, price, limits, payment methods).
    *   *Success (empty):* The hook returns an empty array. The UI renders an empty state message.
    *   *Error:* The hook returns an error. The UI renders an error message (e.g., rate-limited).

## 3. File Changes

### New Files
*   `app/(public)/p2p-offers/page.tsx`: Route page wrapping the filter component.
*   `components/p2p-offers-filter.tsx`: The main interactive component for inputs and displaying results.

### Modified Files
*   *(Optional)* Main navigation or layout component (e.g., `components/navbar.tsx` or `app/layout.tsx`): To add a link to `/p2p-offers`.

## 4. Interfaces

### `P2POffersFilter` State
```typescript
interface FilterState {
  tradeType: 'BUY' | 'SELL';
  amount: number | null; // VES amount
  payType: string | null; // e.g., 'PagoMovil', 'Banesco'
}
```

### Hook Integration (`useBinanceP2POffers`)
The component will pass the following arguments to the hook based on user input:
```typescript
const { data, isLoading, error } = useBinanceP2POffers({
  asset: 'USDT',
  fiat: 'VES',
  tradeType: filterState.tradeType,
  payTypes: filterState.payType ? [filterState.payType] : [],
  transAmount: filterState.amount ? filterState.amount : undefined,
});
```

## 5. Testing Strategy

*   **Unit Tests:**
    *   Test `p2p-offers-filter.tsx` to ensure filter state updates correctly when inputs change.
    *   Mock `useBinanceP2POffers` to simulate loading, success (with and without data), and error states.
*   **Integration Tests:**
    *   Verify that navigating to `/p2p-offers` correctly renders the filter component.
    *   Verify that changing the trade type from "Comprar USDT" to "Vender USDT" calls the mocked hook with `tradeType: "SELL"`.
*   **Manual/E2E Testing:**
    *   Verify responsiveness across different device sizes.
    *   Check for smooth transitions between loading and data states.
    *   Simulate an API failure to verify the graceful error message.

## 6. Migration

*   No database migrations are required for this change as it entirely interacts with an external API (Binance) and does not persist new entities in the local database.
*   Deployments only require frontend updates. No backend schema changes needed.
