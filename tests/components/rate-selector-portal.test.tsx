import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RateSelector } from '@/components/currency/rate-selector';
import { useAppStore } from '@/lib/store';

jest.mock('@/hooks/use-bcv-rates', () => ({
  useBCVRates: () => ({ usd: 36.5, eur: 40.2 }),
}));

jest.mock('@/hooks/use-binance-rates', () => ({
  useBinanceRates: () => ({ rates: { usd_ves: 37 } }),
}));

jest.mock('@/lib/store', () => ({
  useAppStore: jest.fn(),
}));

describe('RateSelector overlay portalization', () => {
  const mockSetSelectedRateSource = jest.fn();
  const mockUseAppStore = useAppStore as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAppStore.mockImplementation(
      (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
          selectedRateSource: 'bcv_usd',
          setSelectedRateSource: mockSetSelectedRateSource,
        })
    );

    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  });

  afterEach(() => {
    document.getElementById('modal-root')?.remove();
  });

  it('portals dropdown outside header ancestry and closes by backdrop', async () => {
    render(
      <header>
        <RateSelector />
      </header>
    );

    const header = screen.getByRole('banner');

    fireEvent.click(screen.getByTitle('Seleccionar fuente de tasa'));

    const option = await screen.findByText('BCV USD');
    expect(header.contains(option)).toBe(false);

    const panel = option.closest('div.black-theme-card');
    expect(panel).toHaveClass('z-[55]');

    const backdrop = document.querySelector(
      '[data-overlay-backdrop="rate-selector"]'
    );
    expect(backdrop).toHaveClass('z-[54]');

    fireEvent.click(backdrop as Element);

    await waitFor(() => {
      expect(screen.queryByText('BCV USD')).not.toBeInTheDocument();
    });
  });
});
