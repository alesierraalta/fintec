import { render, screen } from '@testing-library/react';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';

const snapshot = {
  rates: { usdt_ves: 930.5 },
  status: 'live',
  message: null,
  error: null,
  loading: false,
  lastUpdatedLabel: 'Actualizado ahora',
  refetch: jest.fn(),
} as unknown as BinanceRatesSnapshot;

describe('BinanceRatesComponent', () => {
  it('renders the supplied snapshot and one internal offer-discovery CTA', () => {
    render(<BinanceRatesComponent snapshot={snapshot} />);
    expect(screen.getByText('Bs. 930,50')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /explorar ofertas p2p/i })
    ).toHaveAttribute('href', '/p2p-offers');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(
      screen.queryByTestId('binance-offers-explorer')
    ).not.toBeInTheDocument();
  });

  it('preserves loading, freshness, message, and refresh behavior without an explorer', () => {
    const loadingSnapshot = {
      ...snapshot,
      loading: true,
      status: 'stale',
      message: 'Usando la última referencia disponible',
      lastUpdatedLabel: 'Actualizado ayer',
    } as unknown as BinanceRatesSnapshot;
    render(<BinanceRatesComponent snapshot={loadingSnapshot} />);

    expect(screen.getByRole('status')).toHaveTextContent('Actualizando…');
    expect(screen.getByRole('alert')).toHaveTextContent(/última referencia/i);
    expect(screen.getByText('Actualizado ayer')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /actualizar tasa/i })
    ).toBeDisabled();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(
      screen.queryByText(/comprar|vender|buscar ofertas/i)
    ).not.toBeInTheDocument();
  });

  it('shows the supplied error/reference state and keeps the dedicated CTA exact', () => {
    const errorSnapshot = {
      ...snapshot,
      status: 'error',
      error: 'No se pudo actualizar',
      lastUpdatedLabel: 'Sin actualización reciente',
    } as unknown as BinanceRatesSnapshot;
    render(<BinanceRatesComponent snapshot={errorSnapshot} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo actualizar'
    );
    expect(
      screen.getByRole('link', { name: /explorar ofertas p2p/i })
    ).toHaveAttribute('href', '/p2p-offers');
    expect(
      screen.queryByTestId('binance-offers-explorer')
    ).not.toBeInTheDocument();
  });
});
