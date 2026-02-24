import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DesktopTransfer } from '@/components/transfers/desktop-transfer';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { useActiveUsdVesRate } from '@/lib/rates';

jest.mock('@/providers', () => ({
  useRepository: jest.fn(),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-bcv-rates', () => ({
  useBCVRates: jest.fn(),
}));

jest.mock('@/hooks/use-binance-rates', () => ({
  useBinanceRates: jest.fn(),
}));

jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: jest.fn(),
}));

describe('DesktopTransfer exchange sync', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    });

    (useRepository as jest.Mock).mockReturnValue({
      accounts: {
        findByUserId: jest.fn().mockResolvedValue([
          {
            id: 'acc-usd',
            userId: 'user-1',
            name: 'Cuenta USD',
            currencyCode: 'USD',
            balance: 500000,
            active: true,
          },
          {
            id: 'acc-ves',
            userId: 'user-1',
            name: 'Cuenta VES',
            currencyCode: 'VES',
            balance: 10000000,
            active: true,
          },
        ]),
      },
    });

    (useActiveUsdVesRate as jest.Mock).mockReturnValue(36.5);
    (useBCVRates as jest.Mock).mockReturnValue({ usd: 36.5, eur: 40 });
    (useBinanceRates as jest.Mock).mockReturnValue({
      rates: { usd_ves: 36.4 },
    });
  });

  it('recalculates source and target amounts with last-edited-wins in USD/VES', async () => {
    render(<DesktopTransfer />);

    await waitFor(() => {
      expect(screen.queryByText('Cargando cuentas...')).not.toBeInTheDocument();
    });

    const usdButtons = screen.getAllByRole('button', { name: /Cuenta USD/i });
    const vesButtons = screen.getAllByRole('button', { name: /Cuenta VES/i });

    fireEvent.click(usdButtons[0]);
    fireEvent.click(vesButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Monto Recibido (VES)')).toBeInTheDocument();
    });

    let amountInputs = screen.getAllByRole('spinbutton');
    const sourceInput = amountInputs[0];
    const targetInput = amountInputs[1];

    fireEvent.change(sourceInput, { target: { value: '10' } });

    await waitFor(() => {
      expect(targetInput).toHaveValue(365);
    });

    fireEvent.change(targetInput, { target: { value: '730' } });

    await waitFor(() => {
      amountInputs = screen.getAllByRole('spinbutton');
      expect(amountInputs[0]).toHaveValue(20);
      expect(amountInputs[1]).toHaveValue(730);
    });
  });
});
