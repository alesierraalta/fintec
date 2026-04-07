import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PricingPageClient from '@/app/pricing/pricing-page-client';

const push = jest.fn();
const mockUseAuth = jest.fn();
const mockUseSubscription = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
  }),
}));

jest.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/payment-orders/CheckoutBinance', () => ({
  CheckoutBinance: ({
    amount,
    serviceName,
  }: {
    amount: string;
    serviceName: string;
  }) => (
    <div data-testid="checkout-binance">
      {serviceName}::{amount}
    </div>
  ),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/hooks/use-subscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

describe('PricingPageClient', () => {
  function getPlanFullUpgradeButton() {
    const planHeading = screen.getByRole('heading', { name: 'Plan Full' });
    const planCard =
      planHeading.closest('div[class]')?.parentElement?.parentElement;

    if (!planCard) {
      throw new Error('Plan Full card not found');
    }

    return within(planCard).getByRole('button', { name: /actualizar/i });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockUseSubscription.mockReturnValue({
      tier: 'free',
      loading: false,
    });
  });

  it('reveals the manual Binance checkout flow after selecting a paid plan', async () => {
    const user = userEvent.setup();

    render(<PricingPageClient initialSubscription={null} />);

    await user.click(getPlanFullUpgradeButton());

    expect(await screen.findByTestId('checkout-binance')).toHaveTextContent(
      'Plan Full mensual::5.99'
    );
  });

  it('redirects anonymous users to login instead of opening checkout', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ user: null });

    render(<PricingPageClient initialSubscription={null} />);

    await user.click(getPlanFullUpgradeButton());

    expect(push).toHaveBeenCalledWith('/auth/login');
    expect(screen.queryByTestId('checkout-binance')).not.toBeInTheDocument();
  });
});
