# P2P Offers Filter UI Specification

## Overview
This specification defines the UI requirements for the new P2P Offers Filter functionality, allowing users to find USDT offers on Binance P2P filtered by transaction type, VES amount, and payment method.

## Requirements

### P2P Offers Page
- The application SHALL provide a new route at `/p2p-offers`.
- The page MUST render the `P2POffersFilter` Client Component.
- The page SHALL display a list or grid of offers retrieved from the Binance API via the `useBinanceP2POffers` hook.

### Filter Component (`p2p-offers-filter.tsx`)
- The component MUST include a control to select the transaction type with options "Comprar USDT" (Buy) and "Vender USDT" (Sell). The default selection SHALL be "Comprar USDT".
- The component MUST include a numeric input field to specify the amount in VES.
- The component MUST include a control (e.g., dropdown) to select a preferred payment method.
- The component MUST trigger a data fetch using `useBinanceP2POffers` when filter values change or a submit action is performed.

### Offers Display & States
- While fetching data, the UI MUST display a loading indicator.
- If the fetch returns no results, the UI MUST display a user-friendly empty state message (e.g., "No offers found matching your criteria").
- If the fetch fails due to an error (e.g., API rate limiting), the UI MUST display a graceful error message indicating the failure to the user.
- The displayed offers MUST show relevant details such as advertiser name, price, available quantity, limits, and payment methods.

## Scenarios

### Scenario 1: Navigating to the P2P Offers page
* **Given** a user navigates to `/p2p-offers`
* **When** the page loads
* **Then** the page MUST display the P2P Offers filter controls and an initial list of offers (or empty state if none are fetched by default).

### Scenario 2: Filtering Buy Offers by Amount and Payment Method (Happy Path)
* **Given** the user is on the `/p2p-offers` page
* **When** the user selects "Comprar USDT", enters an amount of "1000" in the VES input, selects a valid payment method, and submits the filter
* **Then** the `useBinanceP2POffers` hook MUST be called with `tradeType="BUY"`, `fiat="VES"`, `asset="USDT"`, and the specified `payTypes`
* **And** the UI MUST display a loading state during the request
* **And** the UI MUST display the resulting list of matching offers.

### Scenario 3: Filtering Sell Offers
* **Given** the user is on the `/p2p-offers` page
* **When** the user selects "Vender USDT"
* **Then** the `useBinanceP2POffers` hook MUST be called with `tradeType="SELL"`
* **And** the UI MUST display the resulting list of matching offers.

### Scenario 4: Handling Empty Results (Edge Case)
* **Given** the user is on the `/p2p-offers` page
* **When** the user inputs an extremely large amount of VES that no offer can satisfy and submits
* **Then** the API call completes with zero results
* **And** the UI MUST display an empty state message informing the user that no offers match the criteria.

### Scenario 5: Handling API Errors (Edge Case)
* **Given** the user is on the `/p2p-offers` page
* **When** the user attempts to filter offers but the Binance API is rate-limited or unavailable
* **Then** the `useBinanceP2POffers` hook returns an error state
* **And** the UI MUST hide the loading indicator
* **And** the UI MUST display a user-friendly error message indicating that offers could not be retrieved at this time.
