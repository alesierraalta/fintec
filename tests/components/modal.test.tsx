import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, ...props }, ref) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )
    ),
  },
}));

import { Modal } from '@/components/ui/modal';

describe('Modal - Dynamic Import', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<Modal {...defaultProps} open={false} />);
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('should call onClose when escape key is pressed', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<Modal {...defaultProps} size="lg" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('uses unique title and description IDs for each modal instance', () => {
    render(
      <>
        <Modal
          open={true}
          onClose={jest.fn()}
          title="First modal"
          description="First description"
        >
          <div>First content</div>
        </Modal>
        <Modal
          open={true}
          onClose={jest.fn()}
          title="Second modal"
          description="Second description"
        >
          <div>Second content</div>
        </Modal>
      </>
    );

    const dialogs = screen.getAllByRole('dialog');
    const labelledBy = dialogs.map((dialog) =>
      dialog.getAttribute('aria-labelledby')
    );
    const describedBy = dialogs.map((dialog) =>
      dialog.getAttribute('aria-describedby')
    );

    expect(new Set(labelledBy).size).toBe(2);
    expect(new Set(describedBy).size).toBe(2);
    labelledBy.forEach((id) =>
      expect(id && document.getElementById(id)).toBeTruthy()
    );
    describedBy.forEach((id) =>
      expect(id && document.getElementById(id)).toBeTruthy()
    );
  });

  it('contains tab focus and returns focus to the opener when closed', async () => {
    const { rerender } = render(
      <button type="button" data-testid="modal-opener">
        Open modal
      </button>
    );
    const opener = screen.getByTestId('modal-opener');
    opener.focus();

    rerender(
      <>
        <button type="button" data-testid="modal-opener">
          Open modal
        </button>
        <Modal open={true} onClose={jest.fn()} title="Focusable modal">
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </Modal>
      </>
    );

    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog).toHaveFocus());

    const lastAction = screen.getByRole('button', { name: 'Last action' });
    const closeButton = screen.getByRole('button', { name: 'Cerrar modal' });
    lastAction.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    rerender(
      <button type="button" data-testid="modal-opener">
        Open modal
      </button>
    );
    expect(screen.getByTestId('modal-opener')).toHaveFocus();
  });

  it('should render without title', () => {
    render(
      <Modal open={true} onClose={jest.fn()}>
        <div>No title content</div>
      </Modal>
    );
    expect(screen.getByText('No title content')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cerrar modal')).not.toBeInTheDocument();
  });
});
