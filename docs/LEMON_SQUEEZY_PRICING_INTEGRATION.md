# Lemon Squeezy Pricing Integration

## Overview

This document describes the implementation of dynamic pricing integration with Lemon Squeezy on the FINTEC pricing page. The pricing information is now fetched directly from Lemon Squeezy products and variants, ensuring that displayed prices are always up-to-date with the configured products.

## Implementation Summary

### Date: October 9, 2025

### Components Modified

1. **API Route**: `app/api/lemonsqueezy/products/route.ts`
   - New endpoint that fetches all products and their variants from Lemon Squeezy
   - Implements caching with 1-hour revalidation
   - Returns structured product data including variants

2. **Hook**: `hooks/use-lemon-squeezy-products.ts`
   - Custom React hook to fetch and manage Lemon Squeezy products
   - Handles loading and error states
   - Provides type-safe product data

3. **Component**: `components/subscription/pricing-cards.tsx`
   - Updated to use `useLemonSqueezyProducts` hook
   - Dynamically maps Lemon Squeezy products to pricing tiers
   - Fallback to static data if API is unavailable
   - Shows loading and error states

4. **Configuration**: `jest.config.js`
   - Fixed `moduleNameMapping` → `moduleNameMapper` for proper path resolution in tests

### Features

#### Dynamic Pricing Display
- Pricing information (price, name, interval) is fetched from Lemon Squeezy
- Product matching based on slug patterns:
  - Base tier: products containing "full" or "base"
  - Premium tier: products containing "premium" or "ia"
- Features list remains static for better control over messaging

#### Smart Fallback
- If Lemon Squeezy API is unavailable, falls back to static pricing data
- Graceful error handling with user-friendly error message

#### Loading States
- Shows loading spinner while fetching products
- Prevents layout shift during data loading

#### Caching Strategy
- Server-side caching with 1-hour revalidation
- Reduces API calls to Lemon Squeezy
- Improves page load performance

### Product Mapping

The system currently maps two Lemon Squeezy products:

1. **Plan Full** (Base Tier)
   - Product ID: 656807
   - Variant ID: 1031352
   - Price: $5.99/month
   - 14-day free trial

2. **Plan Premium IA** (Premium Tier)
   - Product ID: 656822
   - Variant ID: 1031375
   - Price: $9.99/month
   - 14-day free trial

### Testing

#### Unit Tests
- `tests/hooks/use-lemon-squeezy-products.test.ts`: Tests for the hook
  - Successful product fetching
  - Error handling
  - Network error handling

- `tests/components/subscription/pricing-cards.test.tsx`: Tests for the component
  - Loading state display
  - Error state display
  - Dynamic pricing from Lemon Squeezy
  - Fallback to static data

All tests passing ✅

### Data Flow

```
Lemon Squeezy API
    ↓
GET /api/lemonsqueezy/products
    ↓
useLemonSqueezyProducts hook
    ↓
PricingCards component
    ↓
User sees updated pricing
```

### Environment Variables Required

The following environment variables must be configured:

- `LEMONSQUEEZY_API_KEY`: API key from Lemon Squeezy
- `LEMONSQUEEZY_STORE_ID`: Store ID from Lemon Squeezy dashboard

These are already configured in `lib/lemonsqueezy/config.ts`.

### Benefits

1. **Always Up-to-Date**: Pricing changes in Lemon Squeezy automatically reflect on the website
2. **Centralized Management**: Manage pricing from Lemon Squeezy dashboard
3. **Reduced Maintenance**: No need to manually update pricing in code
4. **Better UX**: Smooth loading states and error handling
5. **Type Safety**: Full TypeScript support for product data
6. **Testable**: Comprehensive test coverage for reliability

### Future Enhancements

Potential improvements for the future:

1. **Product Descriptions**: Fetch and display product descriptions from Lemon Squeezy
2. **Multiple Variants**: Support different billing intervals (monthly/yearly)
3. **Promotional Pricing**: Display discounts and promotional prices
4. **Currency Localization**: Show prices in user's local currency
5. **A/B Testing**: Test different pricing strategies
6. **Analytics**: Track which plans users view and select

### Maintenance

To update pricing:
1. Update products in Lemon Squeezy dashboard
2. Changes will be reflected on the website within 1 hour (cache expiry)
3. For immediate updates, clear the Next.js cache or redeploy

### Troubleshooting

**Problem**: Pricing not updating
- **Solution**: Check Lemon Squeezy API credentials
- **Solution**: Verify product slugs match the expected patterns
- **Solution**: Clear Next.js cache

**Problem**: Error message shown to users
- **Solution**: Check Lemon Squeezy API status
- **Solution**: Verify API key permissions
- **Solution**: Check network connectivity

**Problem**: Tests failing
- **Solution**: Ensure `moduleNameMapper` is correctly configured in `jest.config.js`
- **Solution**: Run `npm test` to verify all tests pass

## Conclusion

This implementation provides a robust, maintainable, and user-friendly way to display pricing information that stays synchronized with Lemon Squeezy products. The architecture supports graceful degradation and provides a solid foundation for future enhancements.

