/**
 * Tests for PricingCards component
 * 
 * This test ensures that the pricing cards correctly display
 * Paddle product data and handle loading/error states
 */

import { render, screen, waitFor } from '@testing-library/react';
import { PricingCards } from '@/components/subscription/pricing-cards';
import * as usePaddleProductsModule from '@/hooks/use-paddle-products';


// Mock the hook
jest.mock('@/hooks/use-paddle-products', () => ({
  usePaddleProducts: jest.fn(),
}));

// Mock the config
jest.mock('@/lib/paddle/config', () => ({
  paddleConfig: {
    products: {
      base: 'pro_base_123',
      premium: 'pro_premium_456',
    },
  },
}));

const mockUsePaddleProducts = usePaddleProductsModule.usePaddleProducts as jest.MockedFunction<
  typeof usePaddleProductsModule.usePaddleProducts
>;

describe('PricingCards', () => {
  const mockOnSelectTier = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state while fetching products', () => {
    mockUsePaddleProducts.mockReturnValue({
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
    mockUsePaddleProducts.mockReturnValue({
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

  it('should display pricing cards with Paddle data', async () => {
    const mockProducts: any[] = [
      {
        id: 'pro_base_123',
        name: 'Plan Full',
        description: 'Test description',
        status: 'active',
        prices: [
          {
            unit_price: { amount: '599', currency_code: 'USD' },
            billing_cycle: { interval: 'month', frequency: 1 },
          },
        ],
      },
      {
        id: 'pro_premium_456',
        name: 'Plan Premium IA',
        description: 'Test premium description',
        status: 'active',
        prices: [
          {
            unit_price: { amount: '999', currency_code: 'USD' },
            billing_cycle: { interval: 'month', frequency: 1 },
          },
        ],
      },
    ];

    mockUsePaddleProducts.mockReturnValue({
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

      // Check pricing from Paddle
      expect(screen.getByText('$5.99')).toBeInTheDocument();
      expect(screen.getByText('$9.99')).toBeInTheDocument();
    });
  });

  it('should fall back to static data when Paddle data is not available', () => {
    mockUsePaddleProducts.mockReturnValue({
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
    expect(screen.getByText('Plan Full')).toBeInTheDocument();
    expect(screen.getByText('Premium IA')).toBeInTheDocument();
    expect(screen.getByText('$5.99')).toBeInTheDocument();
  });
});