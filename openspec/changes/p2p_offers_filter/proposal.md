# Proposal: P2P Offers Filter

## Intent
Add a P2P offers filter functionality to allow users to easily find USDT offers on Binance P2P. Users need to be able to filter by transaction type (Buy/Sell), specify an amount in VES, and select their preferred payment method.

## Scope
### In Scope
*   Create a new dedicated page at `/p2p-offers`.
*   Develop a Client Component (`p2p-offers-filter.tsx`) for the interactive filter UI.
*   The UI will include controls for:
    *   Selecting "Comprar USDT" (Buy) or "Vender USDT" (Sell).
    *   Inputting an amount in VES.
    *   Selecting a payment method.
*   Integrate the `useBinanceP2POffers` hook to fetch and display the filtered results.
*   Display the fetched offers in a user-friendly format on the page.

### Out of Scope
*   Handling transactions directly (this is just a filter/display of Binance offers).
*   Filtering for cryptocurrencies other than USDT.
*   Filtering for fiat currencies other than VES.

## Approach
We will build a new page component at `app/(public)/p2p-offers/page.tsx` that will host the `P2POffersFilter` Client Component.
The `P2POffersFilter` component will manage the local state for the filter inputs (transaction type, amount, payment method) and use the `useBinanceP2POffers` hook to query the API.
The results from the hook will be rendered in a list or grid below the filter controls.

## Affected Areas
*   New page: `app/(public)/p2p-offers/page.tsx`
*   New component: `components/p2p-offers-filter.tsx` (or similar appropriate location for the client component).
*   Navigation/Routing (if a link to this new page needs to be added to the main menu/layout).

## Risks
*   **API Rate Limiting/Errors:** The `useBinanceP2POffers` hook depends on the Binance API. We need to handle potential errors or rate limits gracefully in the UI.
*   **Data Accuracy:** Ensure the fetched offers correctly reflect the user's selected filters.

## Rollback Plan
*   Revert the commit that adds the new page and component.
*   Remove any links to the `/p2p-offers` page from the navigation.

## Dependencies
*   `useBinanceP2POffers` hook must be available and correctly implemented to handle the required filter parameters (tradeType, fiat, asset, payTypes).

## Success Criteria
*   Users can navigate to `/p2p-offers`.
*   Users can successfully input an amount, choose buy/sell, and select a payment method.
*   The page displays a list of USDT offers that match the selected criteria.
*   The UI is responsive and provides feedback during loading states or if no offers are found.
