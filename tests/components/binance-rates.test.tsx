import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';
import {
  BINANCE_P2P_MARKET_URL,
  type BinanceP2POffer,
  type BinanceP2POffersQuery,
  type BinanceP2POffersResult,
  type BinanceP2POffersStatus,
} from '@/types/binance-p2p-offers';

const snapshot = {} as BinanceRatesSnapshot;

function createOffer(): BinanceP2POffer {
  return {
    id: 'fixture-offer-1',
    advertiserSide: 'BUY',
    priceMinor: 12_345,
    availableQuantity: { value: '1234.5600', scale: 4 },
    minFiatMinor: 50_000,
    maxFiatMinor: 500_000_000,
    paymentMethods: [{ identifier: 'Banesco', name: 'Banesco' }],
    payTimeLimitMinutes: 15,
    merchant: {
      nickname: 'Comerciante de prueba',
      monthOrderCount: 87,
      monthCompletionRateBps: 9_875,
      positiveRateBps: 9_900,
    },
  };
}

function createResult(
  status: BinanceP2POffersStatus,
  query: BinanceP2POffersQuery,
  offers: BinanceP2POffer[]
): BinanceP2POffersResult {
  return {
    status,
    query,
    offers,
    fetchedAt: status === 'unavailable' ? null : '2026-07-16T12:00:00.000Z',
  };
}

function createResponse(body: unknown, status = 200, retryAfter?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'retry-after' ? (retryAfter ?? null) : null,
    },
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('Binance P2P offers explorer', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('submits exact filters only on demand and renders normalized offers', async () => {
    const user = userEvent.setup();
    let resolveRequest: (response: Response) => void = () => {};
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    (global.fetch as jest.Mock).mockReturnValue(request);

    render(<BinanceRatesComponent snapshot={snapshot} />);
    expect(global.fetch).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('binance-offers-side-sell'));
    await user.clear(screen.getByTestId('binance-offers-amount'));
    await user.type(screen.getByTestId('binance-offers-amount'), '1.234,56');
    await user.selectOptions(
      screen.getByTestId('binance-offers-payment'),
      'Banesco'
    );
    await user.click(screen.getByTestId('binance-offers-search'));

    expect(
      screen.getByRole('status', { name: 'Buscando ofertas' })
    ).toBeInTheDocument();
    const submittedQuery: BinanceP2POffersQuery = {
      side: 'SELL',
      amountMinor: 123_456,
      paymentMethod: 'Banesco',
    };
    resolveRequest(
      createResponse(createResult('live', submittedQuery, [createOffer()]))
    );

    expect(
      await screen.findByText('Comerciante de prueba')
    ).toBeInTheDocument();
    expect(screen.getByText('Bs. 123,45')).toBeInTheDocument();
    expect(screen.getByText('1.234,5600 USDT')).toBeInTheDocument();

    const requestInit = (global.fetch as jest.Mock).mock
      .calls[0][1] as RequestInit;
    expect(JSON.parse(requestInit.body as string)).toEqual(submittedQuery);

    const handoff = screen.getByRole('link', {
      name: /Continuar en Binance/i,
    });
    expect(handoff).toHaveAttribute('href', BINANCE_P2P_MARKET_URL);
    expect(handoff).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([
    ['stale', [createOffer()], /resultados recientes almacenados/i, 200],
    ['empty', [], /No se encontraron ofertas/i, 200],
    ['unavailable', [], /Ofertas no disponibles/i, 503],
  ] as const)(
    'renders the %s state without simulated fallback offers',
    async (status, offers, expectedCopy, responseStatus) => {
      const user = userEvent.setup();
      const query: BinanceP2POffersQuery = {
        side: 'BUY',
        amountMinor: 100_000,
        paymentMethod: 'PagoMovil',
      };
      (global.fetch as jest.Mock).mockResolvedValue(
        createResponse(createResult(status, query, [...offers]), responseStatus)
      );

      render(<BinanceRatesComponent snapshot={snapshot} />);
      await user.click(screen.getByTestId('binance-offers-search'));

      expect(await screen.findByText(expectedCopy)).toBeInTheDocument();
      if (status !== 'stale') {
        expect(
          screen.queryByText('Comerciante de prueba')
        ).not.toBeInTheDocument();
      }
    }
  );
});
