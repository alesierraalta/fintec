import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileMenuFAB } from '@/components/layout/mobile-menu-fab';

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

    render(<MobileMenuFAB />);

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
});
