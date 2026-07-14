import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DesktopTransfer } from '@/components/transfers/desktop-transfer';
import { MobileTransfer } from '@/components/transfers/mobile-transfer';
import { TransferHistory } from '@/components/transfers/transfer-history';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

jest.mock('@/providers', () => ({ useRepository: jest.fn() }));
jest.mock('@/hooks/use-auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/use-bcv-rates', () => ({ useBCVRates: jest.fn() }));
jest.mock('@/hooks/use-binance-rates', () => ({ useBinanceRates: jest.fn() }));
jest.mock('@/lib/store', () => ({ useAppStore: jest.fn() }));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('@/repositories/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'access-token' } },
      }),
    },
  },
}));

const accounts = [
  {
    id: 'usd',
    name: 'Cuenta USD',
    currencyCode: 'USD',
    balance: 500000,
    active: true,
  },
  {
    id: 'ves',
    name: 'Cuenta VES',
    currencyCode: 'VES',
    balance: 10000000,
    active: true,
  },
];

describe('transfer API response handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      session: { access_token: 'access-token' },
      loading: false,
    });
    (useRepository as jest.Mock).mockReturnValue({
      accounts: { findByUserId: jest.fn().mockResolvedValue(accounts) },
    });
    (useBCVRates as jest.Mock).mockReturnValue({ usd: 36.5, eur: 40 });
    (useBinanceRates as jest.Mock).mockReturnValue({
      rates: { usd_ves: 36.4 },
    });
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ selectedRateSource: 'bcv_usd' })
    );
  });

  it.each([
    ['desktop', DesktopTransfer],
    ['mobile', MobileTransfer],
  ])(
    'treats a successful standard envelope as success in %s transfer',
    async (_, Component) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          data: { id: 'transfer-1' },
          error: null,
          meta: {},
        }),
      }) as jest.Mock;

      const { container } = render(<Component />);
      await waitFor(() => {
        expect(
          screen.queryByText('Cargando cuentas...')
        ).not.toBeInTheDocument();
      });

      fireEvent.click(
        screen.getAllByRole('button', { name: /Cuenta USD/i })[0]
      );
      fireEvent.click(
        screen.getAllByRole('button', { name: /Cuenta VES/i })[1]
      );
      fireEvent.change(screen.getAllByRole('spinbutton')[0], {
        target: { value: '10' },
      });
      fireEvent.change(container.querySelector('input[type="date"]')!, {
        target: { value: '2026-07-14' },
      });
      if (Component === MobileTransfer) {
        await screen.findByText('Confirmar Transferencia');
        fireEvent.click(
          await screen.findByRole('button', { name: 'Transferir' })
        );
      } else {
        fireEvent.click(
          await screen.findByRole('button', { name: /Realizar Transferencia/i })
        );
      }

      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(toast.error).not.toHaveBeenCalled();
    }
  );

  it('reads the transfers array from the standard history envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        data: {
          transfers: [
            {
              id: 'transfer-1',
              fromTransaction: {
                accountName: 'Cuenta USD',
                currencyCode: 'USD',
              },
              toTransaction: {
                accountName: 'Cuenta VES',
                currencyCode: 'VES',
              },
              amount: 1000,
              date: '2026-07-14',
              description: 'Envelope transfer',
            },
          ],
          count: 1,
        },
        error: null,
        meta: {},
      }),
    }) as jest.Mock;

    render(<TransferHistory />);

    expect(await screen.findByText('Envelope transfer')).toBeInTheDocument();
    expect(
      screen.queryByText('Error al cargar transferencias')
    ).not.toBeInTheDocument();
  });
});
