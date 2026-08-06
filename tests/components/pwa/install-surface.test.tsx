import { render, screen, fireEvent } from '@testing-library/react';
import { InstallSurface } from '@/components/pwa/install-surface';

describe('InstallSurface', () => {
  it('renders as a labeled, non-modal region', () => {
    render(<InstallSurface label="Instalar FinTec">Contenido</InstallSurface>);

    const region = screen.getByRole('region', { name: 'Instalar FinTec' });
    expect(region).toBeInTheDocument();
    expect(region).toHaveTextContent('Contenido');
  });

  it('calls onEscape when Escape is pressed', () => {
    const onEscape = jest.fn();
    render(
      <InstallSurface label="Instalar FinTec" onEscape={onEscape}>
        Contenido
      </InstallSurface>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('removes the Escape listener on unmount', () => {
    const onEscape = jest.fn();
    const { unmount } = render(
      <InstallSurface label="Instalar FinTec" onEscape={onEscape}>
        Contenido
      </InstallSurface>
    );

    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('renders with a z-index strictly below the mobile FAB layer (z-50, see components/layout/mobile-menu-fab.tsx)', () => {
    render(<InstallSurface label="Instalar FinTec">Contenido</InstallSurface>);

    const region = screen.getByRole('region');
    const zIndexMatch = region.className.match(/z-\[(\d+)\]/);
    expect(zIndexMatch).not.toBeNull();

    const zIndex = Number(zIndexMatch![1]);
    const MOBILE_FAB_Z_INDEX = 50;
    expect(zIndex).toBeLessThan(MOBILE_FAB_Z_INDEX);
  });

  it('offsets bottom position to account for the safe-area inset, matching how the bottom nav computes its own height', () => {
    render(<InstallSurface label="Instalar FinTec">Contenido</InstallSurface>);

    const region = screen.getByRole('region');
    expect(region.className).toMatch(
      /bottom-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\]/
    );
  });
});
