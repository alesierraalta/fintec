import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingActionButton } from '@/components/ui/floating-action-button';

// Mock framer-motion to render elements directly without passing animation props to DOM
jest.mock('framer-motion', () => {
  const filterProps = (props: Record<string, any>) => {
    const {
      initial,
      animate,
      exit,
      whileTap,
      whileHover,
      transition,
      layout,
      ...domProps
    } = props;
    return domProps;
  };

  return {
    motion: {
      button: ({
        children,
        className,
        style,
        onClick,
        'aria-label': ariaLabel,
        ...props
      }: any) => (
        <button
          className={className}
          style={style}
          onClick={onClick}
          aria-label={ariaLabel}
          data-testid="floating-action-button"
          {...filterProps(props)}
        >
          {children}
        </button>
      ),
      div: ({ children, className, ...props }: any) => (
        <div className={className} {...filterProps(props)}>
          {children}
        </div>
      ),
      span: ({ children, className, ...props }: any) => (
        <span className={className} {...filterProps(props)}>
          {children}
        </span>
      ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('FloatingActionButton Component', () => {
  beforeEach(() => {
    // Mock innerWidth to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
  });

  it('renders with z-50 and bottom-mobile-chrome positioning', () => {
    const handleClick = jest.fn();
    render(
      <FloatingActionButton
        onClick={handleClick}
        label="Nueva Transacción"
        variant="success"
      />
    );

    const button = screen.getByRole('button', { name: 'Nueva Transacción' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('z-50');
    expect(button).toHaveClass('bottom-mobile-chrome');
    expect(button).toHaveStyle({
      bottom: 'calc(var(--mobile-chrome-bottom, 68px) + 1rem)',
    });

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className without downgrading z-index', () => {
    render(
      <FloatingActionButton
        onClick={jest.fn()}
        label="Crear"
        className="custom-test-class"
      />
    );

    const button = screen.getByRole('button', { name: 'Crear' });
    expect(button).toHaveClass('custom-test-class');
    expect(button).toHaveClass('z-50');
  });

  it('renders extended button with label text', () => {
    render(
      <FloatingActionButton
        onClick={jest.fn()}
        label="Nueva"
        extended={true}
        variant="success"
      />
    );

    const button = screen.getByRole('button', { name: 'Nueva' });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Nueva')).toBeInTheDocument();
  });
});
