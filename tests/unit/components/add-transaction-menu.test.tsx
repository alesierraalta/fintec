import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AddTransactionMenu } from '@/components/transactions/add-transaction-menu';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(
      (
        { children, drag, dragConstraints, dragElastic, onDragEnd, ...props },
        ref
      ) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )
    ),
  },
  useReducedMotion: () => false,
}));

describe('AddTransactionMenu Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.innerWidth = 1024;
  });

  it('navigates to voice capture by default', () => {
    render(<AddTransactionMenu />);
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Capturas + voz' }));
    expect(mockPush).toHaveBeenCalledWith('/transactions?action=voice');
  });

  it('renders trigger button with default label "Agregar"', () => {
    render(<AddTransactionMenu />);
    const button = screen.getByRole('button', { name: /agregar/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders trigger button with custom label', () => {
    render(<AddTransactionMenu label="Nueva Operación" />);
    expect(
      screen.getByRole('button', { name: /nueva operación/i })
    ).toBeInTheDocument();
  });

  it('opens desktop popover with both options when clicked', () => {
    render(<AddTransactionMenu />);
    const trigger = screen.getByRole('button', { name: /agregar/i });

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: /opciones para agregar/i });
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute('id', trigger.getAttribute('aria-controls'));

    expect(
      screen.getByRole('menuitem', { name: /agregar transacción/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /agregar en lote/i })
    ).toBeInTheDocument();
  });

  it('calls onAddSingle or navigates to /transactions/add when selecting single', () => {
    const mockSingle = jest.fn();
    render(<AddTransactionMenu onAddSingle={mockSingle} />);

    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: /agregar transacción/i })
    );

    expect(mockSingle).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('menu', { name: /opciones para agregar/i })
    ).not.toBeInTheDocument();
  });

  it('navigates to /transactions/add by default when no onAddSingle callback is provided', () => {
    render(<AddTransactionMenu />);

    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: /agregar transacción/i })
    );

    expect(mockPush).toHaveBeenCalledWith('/transactions/add');
  });

  it('calls onAddBatch or navigates to /transactions?action=batch when selecting batch', () => {
    const mockBatch = jest.fn();
    render(<AddTransactionMenu onAddBatch={mockBatch} />);

    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /agregar en lote/i }));

    expect(mockBatch).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('menu', { name: /opciones para agregar/i })
    ).not.toBeInTheDocument();
  });

  it('navigates to /transactions?action=batch by default when no onAddBatch callback is provided', () => {
    render(<AddTransactionMenu />);

    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /agregar en lote/i }));

    expect(mockPush).toHaveBeenCalledWith('/transactions?action=batch');
  });

  it.each([
    ['Registro rápido', '/transactions?action=quick'],
    ['Importar extracto', '/transactions?action=import'],
  ])('navigates by default for %s on desktop and mobile', (name, route) => {
    for (const width of [1024, 800]) {
      window.innerWidth = width;
      const view = render(<AddTransactionMenu />);
      fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
      fireEvent.click(screen.getByRole('menuitem', { name }));
      expect(mockPush).toHaveBeenLastCalledWith(route);
      view.unmount();
    }
  });

  it('closes menu when Escape key is pressed', () => {
    render(<AddTransactionMenu />);

    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
    expect(
      screen.getByRole('menu', { name: /opciones para agregar/i })
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('menu', { name: /opciones para agregar/i })
    ).not.toBeInTheDocument();
  });

  it('closes menu when clicking outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <AddTransactionMenu />
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
    expect(
      screen.getByRole('menu', { name: /opciones para agregar/i })
    ).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(
      screen.queryByRole('menu', { name: /opciones para agregar/i })
    ).not.toBeInTheDocument();
  });

  it('renders mobile action sheet below the 1024px shell breakpoint', () => {
    window.innerWidth = 800;
    render(<AddTransactionMenu />);

    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /agregar transacción/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('menuitem', { name: /agregar transacción/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /agregar en lote/i })
    ).toBeInTheDocument();

    // Cancel button closes the sheet
    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
