import { render, screen, fireEvent } from '@testing-library/react';
import { IosInstallSheet } from '@/components/pwa/ios-install-sheet';

describe('IosInstallSheet', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <IosInstallSheet open={false} onDismiss={jest.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('presents the Share -> Add to Home Screen instructions when open, matching the real iOS labels verbatim', () => {
    render(<IosInstallSheet open onDismiss={jest.fn()} />);

    expect(screen.getByText(/compartir/i)).toBeInTheDocument();
    // N4: the real iOS Spanish label is "Añadir a pantalla de inicio", not
    // "Agregar a Inicio" — these instructions exist to be followed
    // verbatim.
    expect(
      screen.getByText(/añadir a pantalla de inicio/i)
    ).toBeInTheDocument();
  });

  it('calls onDismiss when the dismiss action is used', () => {
    const onDismiss = jest.fn();
    render(<IosInstallSheet open onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /entendido|cerrar/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('falls back to onDismiss for Escape when no distinct onEscape is provided', () => {
    const onDismiss = jest.fn();
    render(<IosInstallSheet open onDismiss={onDismiss} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls a distinct onEscape, not onDismiss, when both are provided', () => {
    const onDismiss = jest.fn();
    const onEscape = jest.fn();
    render(<IosInstallSheet open onDismiss={onDismiss} onEscape={onEscape} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
