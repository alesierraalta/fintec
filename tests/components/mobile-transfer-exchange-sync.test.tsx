import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileTransfer } from '@/components/transfers/mobile-transfer';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { useAppStore } from '@/lib/store';

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

jest.mock('@/lib/store', () => ({
  useAppStore: jest.fn(),
}));

describe('MobileTransfer exchange sync', () => {
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

    (useAppStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({ selectedRateSource: 'bcv_usd' })
    );
    (useBCVRates as jest.Mock).mockReturnValue({ usd: 36.5, eur: 40 });
    (useBinanceRates as jest.Mock).mockReturnValue({
      rates: { usd_ves: 36.4 },
    });
  });

  it('in manual mode recalculates source amount when target is edited in USD/VES', async () => {
    render(<MobileTransfer />);

    await waitFor(() => {
      expect(screen.queryByText('Cargando cuentas...')).not.toBeInTheDocument();
    });

    const usdButtons = screen.getAllByRole('button', { name: /Cuenta USD/i });
    fireEvent.click(usdButtons[0]);

    const vesButtons = screen.getAllByRole('button', { name: /Cuenta VES/i });
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

  it('in auto mode derives custom exchange rate from source and target amounts', async () => {
    render(<MobileTransfer />);

    await waitFor(() => {
      expect(screen.queryByText('Cargando cuentas...')).not.toBeInTheDocument();
    });

    const usdButtons = screen.getAllByRole('button', { name: /Cuenta USD/i });
    fireEvent.click(usdButtons[0]);

    const vesButtons = screen.getAllByRole('button', { name: /Cuenta VES/i });
    fireEvent.click(vesButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Monto Recibido (VES)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Auto tasa' }));

    const amountInputs = screen.getAllByRole('spinbutton');
    const sourceInput = amountInputs[0];
    const targetInput = amountInputs[1];

    fireEvent.change(sourceInput, { target: { value: '10' } });
    fireEvent.change(targetInput, { target: { value: '730' } });

    await waitFor(() => {
      const updatedInputs = screen.getAllByRole('spinbutton');
      expect(updatedInputs[0]).toHaveValue(10);
      expect(
        screen.getByText(/Tasa calculada \(VES\/USD\): 73/)
      ).toBeInTheDocument();
    });
  });
});
