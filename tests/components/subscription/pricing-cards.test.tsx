/**
 * Tests for PricingCards component
 * 
 * This test ensures that the pricing cards correctly display
 * Lemon Squeezy product data and handle loading/error states
 */

import { render, screen, waitFor } from '@testing-library/react';
import { PricingCards } from '@/components/subscription/pricing-cards';
import * as useLemonSqueezyProductsModule from '@/hooks/use-lemon-squeezy-products';

// Mock the hook
jest.mock('@/hooks/use-lemon-squeezy-products', () => ({
  useLemonSqueezyProducts: jest.fn(),
}));

const mockUseLemonSqueezyProducts = useLemonSqueezyProductsModule.useLemonSqueezyProducts as jest.MockedFunction<
  typeof useLemonSqueezyProductsModule.useLemonSqueezyProducts
>;

describe('PricingCards', () => {
  const mockOnSelectTier = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state while fetching products', () => {
    mockUseLemonSqueezyProducts.mockReturnValue({
      products: [],
      loading: true,
      error: null,
    });

    const { container } = render(
      <PricingCards
        currentTier="free"
        onSelectTier={mockOnSelectTier}
        loading={false}
      />
    );

    // Check for the loading spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show error state when fetching fails', () => {
    mockUseLemonSqueezyProducts.mockReturnValue({
      products: [],
      loading: false,
      error: 'Failed to fetch',
    });

    render(
      <PricingCards
        currentTier="free"
        onSelectTier={mockOnSelectTier}
        loading={false}
      />
    );

    expect(
      screen.getByText('Error al cargar los planes. Por favor, intenta de nuevo más tarde.')
    ).toBeInTheDocument();
  });

  it('should display pricing cards with Lemon Squeezy data', async () => {
    const mockProducts = [
      {
        id: '656807',
        type: 'products',
        attributes: {
          store_id: 229057,
          name: 'Plan Full',
          slug: 'plan-full',
          description: 'Test description',
          status: 'published',
          price: 599,
          price_formatted: '$5.99/month',
          buy_now_url: 'https://test.com',
          created_at: '2025-10-09T10:59:18.000000Z',
          updated_at: '2025-10-09T10:59:55.000000Z',
          test_mode: true,
        },
        variants: [
          {
            id: '1031352',
            type: 'variants',
            attributes: {
              price: 599,
              is_subscription: true,
              interval: 'month' as const,
              interval_count: 1,
              has_free_trial: true,
              trial_interval: 'day',
              trial_interval_count: 14,
              product_id: 656807,
              name: 'Default',
              slug: 'test-slug',
              description: '',
              status: 'pending',
              test_mode: true,
            },
          },
        ],
      },
      {
        id: '656822',
        type: 'products',
        attributes: {
          store_id: 229057,
          name: 'Plan Premium IA',
          slug: 'plan-premium-ia',
          description: 'Test premium description',
          status: 'published',
          price: 999,
          price_formatted: '$9.99/month',
          buy_now_url: 'https://test.com',
          created_at: '2025-10-09T11:18:44.000000Z',
          updated_at: '2025-10-09T11:19:25.000000Z',
          test_mode: true,
        },
        variants: [
          {
            id: '1031375',
            type: 'variants',
            attributes: {
              price: 999,
              is_subscription: true,
              interval: 'month' as const,
              interval_count: 1,
              has_free_trial: true,
              trial_interval: 'day',
              trial_interval_count: 14,
              product_id: 656822,
              name: 'Default',
              slug: 'test-slug-2',
              description: '',
              status: 'pending',
              test_mode: true,
            },
          },
        ],
      },
    ];

    mockUseLemonSqueezyProducts.mockReturnValue({
      products: mockProducts,
      loading: false,
      error: null,
    });

    render(
      <PricingCards
        currentTier="free"
        onSelectTier={mockOnSelectTier}
        loading={false}
      />
    );

    await waitFor(() => {
      // Check that all three tiers are displayed
      expect(screen.getByText('Gratis')).toBeInTheDocument();
      expect(screen.getByText('Plan Full')).toBeInTheDocument();
      expect(screen.getByText('Plan Premium IA')).toBeInTheDocument();

      // Check pricing from Lemon Squeezy
      expect(screen.getByText('$5.99')).toBeInTheDocument();
      expect(screen.getByText('$9.99')).toBeInTheDocument();
    });
  });

  it('should fall back to static data when Lemon Squeezy data is not available', () => {
    mockUseLemonSqueezyProducts.mockReturnValue({
      products: [],
      loading: false,
      error: null,
    });

    render(
      <PricingCards
        currentTier="free"
        onSelectTier={mockOnSelectTier}
        loading={false}
      />
    );

    // Should display static data
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('$4.99')).toBeInTheDocument();
  });
});

