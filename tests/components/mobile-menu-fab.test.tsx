import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileMenuFAB } from '@/components/layout/mobile-menu-fab';
import { SubscriptionProvider } from '@/providers/subscription-provider';

const mockPush = jest.fn();
const mockUseSidebar = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/contexts/sidebar-context', () => ({
  useSidebar: () => mockUseSidebar(),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// The provider keeps a module-level cache/in-flight map keyed by user id, so
// every test must use a DISTINCT user id to avoid cross-test cache pollution.
let authCounter = 0;
function authAs(overrides: Record<string, unknown> = {}) {
  const id = `menu-fab-${authCounter++}`;
  mockUseAuth.mockReturnValue({
    user: { id, email: `${id}@test.com` },
    session: { access_token: 'token-123' },
    ...overrides,
  });
}

function stubFetch(payload: Record<string, unknown>, ok = true) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok,
    json: async () => (ok ? payload : { error: 'boom' }),
  });
  global.fetch = fetchMock as any;
  return fetchMock;
}

const basePayload = (overrides: Record<string, unknown> = {}) => ({
  subscription: null,
  tier: 'free',
  isOwnerAdmin: false,
  usage: null,
  usageStatus: null,
  limits: {},
  ...overrides,
});

describe('MobileMenuFAB', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSidebar.mockReturnValue({
      isMobile: true,
    });

    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  });

  afterEach(() => {
    document.getElementById('modal-root')?.remove();
  });

  it('renders a fully black trigger in both closed and open states while preserving readable affordances', async () => {
    const user = userEvent.setup();
    authAs();
    stubFetch(basePayload(), false);

    render(
      <SubscriptionProvider>
        <MobileMenuFAB />
      </SubscriptionProvider>
    );

    const trigger = screen.getByTitle('Más opciones');

    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveClass('bg-foreground');
    expect(trigger).toHaveAttribute('aria-label', 'Abrir menú');
    expect(screen.getByAltText('FinTec Menu')).toBeInTheDocument();
    expect(trigger.querySelector('img[alt="FinTec Menu"]')).toBeInTheDocument();
    expect(trigger.querySelector('svg')).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveClass('bg-foreground');
    expect(trigger).toHaveAttribute('aria-label', 'Cerrar menú');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(
      trigger.querySelector('img[alt="FinTec Menu"]')
    ).not.toBeInTheDocument();
    expect(trigger.querySelector('svg')).toBeInTheDocument();
  });

  it('shows the upgrade item for a verified free non-owner user', async () => {
    const user = userEvent.setup();
    authAs();
    stubFetch(basePayload());

    render(
      <SubscriptionProvider>
        <MobileMenuFAB />
      </SubscriptionProvider>
    );

    await user.click(screen.getByTitle('Más opciones'));

    const upgradeItem = screen.getByText('Actualizar Plan');
    expect(upgradeItem).toBeInTheDocument();

    await user.click(upgradeItem);
    expect(mockPush).toHaveBeenCalledWith('/pricing');
  });

  it('never shows the upgrade item for an owner/admin user even when the tier resolves to free', async () => {
    const user = userEvent.setup();
    authAs();
    stubFetch(basePayload({ tier: 'free', isOwnerAdmin: true }));

    render(
      <SubscriptionProvider>
        <MobileMenuFAB />
      </SubscriptionProvider>
    );

    await user.click(screen.getByTitle('Más opciones'));

    expect(screen.queryByText('Actualizar Plan')).not.toBeInTheDocument();
    expect(screen.getByText('Categorías')).toBeInTheDocument();
  });

  it('never shows the upgrade item for a premium user', async () => {
    const user = userEvent.setup();
    authAs();
    stubFetch(basePayload({ tier: 'premium' }));

    render(
      <SubscriptionProvider>
        <MobileMenuFAB />
      </SubscriptionProvider>
    );

    await user.click(screen.getByTitle('Más opciones'));

    expect(screen.queryByText('Actualizar Plan')).not.toBeInTheDocument();
  });

  it('never shows the upgrade item while eligibility is loading', async () => {
    const user = userEvent.setup();
    authAs();
    // Never resolves: the provider stays in the loading state forever.
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})) as any;

    render(
      <SubscriptionProvider>
        <MobileMenuFAB />
      </SubscriptionProvider>
    );

    await user.click(screen.getByTitle('Más opciones'));

    expect(screen.queryByText('Actualizar Plan')).not.toBeInTheDocument();
  });

  it('never shows the upgrade item when the entitlement fetch fails (fail closed)', async () => {
    const user = userEvent.setup();
    authAs();
    stubFetch(basePayload(), false);

    render(
      <SubscriptionProvider>
        <MobileMenuFAB />
      </SubscriptionProvider>
    );

    await user.click(screen.getByTitle('Más opciones'));

    expect(screen.queryByText('Actualizar Plan')).not.toBeInTheDocument();
  });
});
