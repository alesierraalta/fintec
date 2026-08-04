import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import P2POffersFilter from './p2p-offers-filter';
import { useBinanceP2POffers } from '@/hooks/use-binance-p2p-offers';
import type {
  BinanceP2POffer,
  BinanceP2POffersResult,
} from '@/types/binance-p2p-offers';

jest.mock('@/hooks/use-binance-p2p-offers');

const mockUseBinanceP2POffers = useBinanceP2POffers as jest.Mock;

function createOffer(): BinanceP2POffer {
  return {
    id: 'offer1',
    advertiserSide: 'SELL',
    priceMinor: 4050000,
    availableQuantity: { value: '500', scale: 0 },
    minFiatMinor: 100000,
    maxFiatMinor: 5000000,
    paymentMethods: [{ identifier: 'Mercantil', name: 'Mercantil' }],
    payTimeLimitMinutes: 15,
    merchant: {
      nickname: 'CryptoTrader',
      monthOrderCount: 150,
      monthCompletionRateBps: 9850,
      positiveRateBps: 9900,
    },
  };
}

function createResult(
  status: BinanceP2POffersResult['status'],
  offers: BinanceP2POffer[] = [createOffer()]
): BinanceP2POffersResult {
  return {
    status,
    query: { side: 'BUY', amountMinor: 50000, paymentMethod: 'ALL' },
    offers,
    fetchedAt: '2026-07-16T12:00:00.000Z',
  };
}

function renderWithState(
  overrides: Partial<ReturnType<typeof useBinanceP2POffers>>
) {
  mockUseBinanceP2POffers.mockReturnValue({
    status: 'idle',
    result: null,
    error: null,
    retryAfterSeconds: null,
    loading: false,
    search: jest.fn(),
    ...overrides,
  });
  return render(<P2POffersFilter />);
}

describe('P2POffersFilter', () => {
  beforeEach(() => {
    mockUseBinanceP2POffers.mockReturnValue({
      status: 'idle',
      result: null,
      error: null,
      retryAfterSeconds: null,
      loading: false,
      search: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter controls and the initial search guidance', () => {
    renderWithState({});

    expect(
      screen.getByRole('group', { name: 'Operación' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Unidad de cantidad' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Comprar USDT/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Vender USDT/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej. 1000…')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Completados mínimo en porcentaje')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Órdenes mínimas del vendedor')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Buscar ofertas/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Configura tus filtros y consulta el mercado')
    ).toBeInTheDocument();
  });

  it('updates state on user input', () => {
    renderWithState({});

    const amountInput = screen.getByPlaceholderText('Ej. 1000…');
    fireEvent.change(amountInput, { target: { value: '500' } });
    expect(amountInput).toHaveValue(500);

    const sellBtn = screen.getByRole('button', { name: /Vender USDT/i });
    fireEvent.click(sellBtn);
    expect(sellBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /Comprar USDT/i })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls search with correct query on button click', () => {
    const mockSearch = jest.fn();
    renderWithState({ search: mockSearch });

    const amountInput = screen.getByPlaceholderText('Ej. 1000…');
    fireEvent.change(amountInput, { target: { value: '500' } });

    fireEvent.click(screen.getByRole('button', { name: /Buscar ofertas/i }));

    expect(mockSearch).toHaveBeenCalledWith({
      side: 'BUY',
      amountMinor: 50000,
      amountUnit: 'VES',
      paymentMethod: 'ALL',
      minCompletionRateBps: 0,
      minOrderCount: 0,
    });
  });

  it('searches in USDT when the quantity unit changes', () => {
    const mockSearch = jest.fn();
    renderWithState({ search: mockSearch });

    fireEvent.click(screen.getByRole('button', { name: 'USDT' }));
    fireEvent.change(screen.getByLabelText('Cantidad en USDT'), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Buscar ofertas/i }));

    expect(mockSearch).toHaveBeenCalledWith({
      side: 'BUY',
      amountMinor: 1000,
      amountUnit: 'USDT',
      paymentMethod: 'ALL',
      minCompletionRateBps: 0,
      minOrderCount: 0,
    });
  });

  it('sends minimum seller quality filters', () => {
    const mockSearch = jest.fn();
    renderWithState({ search: mockSearch });

    fireEvent.change(
      screen.getByLabelText('Completados mínimo en porcentaje'),
      { target: { value: '95.5' } }
    );
    fireEvent.change(screen.getByLabelText('Órdenes mínimas del vendedor'), {
      target: { value: '100' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Buscar ofertas/i }));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        minCompletionRateBps: 9550,
        minOrderCount: 100,
      })
    );
  });

  it('renders loading state', () => {
    renderWithState({ status: 'loading', loading: true });

    expect(
      screen.getByRole('status', {
        name: 'Obteniendo ofertas de Binance',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Buscando…')).toBeInTheDocument();
  });

  it('renders error state', () => {
    renderWithState({
      status: 'unavailable',
      error: 'Rate limit exceeded',
      retryAfterSeconds: 30,
    });

    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    expect(
      screen.getByText(/Por favor, espera 30 segundos/i)
    ).toBeInTheDocument();
  });

  it('renders empty state', () => {
    renderWithState({ status: 'empty' });

    expect(screen.getByText('No se encontraron ofertas')).toBeInTheDocument();
  });

  it('renders offers with dominant price and market context', () => {
    renderWithState({
      status: 'live',
      result: createResult('live'),
    });

    expect(screen.getByText('CryptoTrader')).toBeInTheDocument();
    expect(screen.getAllByText('Mercantil').length).toBeGreaterThan(0);
    expect(screen.getByText('Bs. 40.500,00')).toBeInTheDocument();
    expect(screen.getByText('500 USDT')).toBeInTheDocument();

    const context = screen.getByText(/1 oferta · Comprar USDT ·/i);
    expect(context).toBeInTheDocument();
    expect(context).toHaveTextContent('Todos los métodos');

    const continueLink = screen.getByRole('link', { name: /Comprar USDT/i });
    expect(continueLink).toHaveAttribute(
      'href',
      'https://p2p.binance.com/en/trade/all-payments/USDT?fiat=VES'
    );
  });
});
