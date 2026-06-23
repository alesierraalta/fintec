import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BinanceEstimator } from '@/components/currency/binance-estimator';

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, whileHover, whileTap, whileInView, ...props }: any) =>
          React.createElement(tag, props, children),
    }
  ),
}));

function renderEstimator(baseRateRaw: number) {
  return render(<BinanceEstimator baseRateRaw={baseRateRaw} />);
}

describe('BinanceEstimator', () => {
  it('renders a visible estimate disclaimer explaining the rate is not exact', () => {
    renderEstimator(79000);

    expect(
      screen.getByText(/estimaci[oó]n basada en las tendencias/i)
    ).toBeInTheDocument();
  });

  it('renders labeled controls for side, payment method and amount tier', () => {
    renderEstimator(79000);

    const sideLabel = screen.getByText('Operación');
    const paymentLabel = screen.getByText('Método de pago');
    const amountLabel = screen.getByText('Monto');

    expect(sideLabel).toBeInTheDocument();
    expect(paymentLabel).toBeInTheDocument();
    expect(amountLabel).toBeInTheDocument();
    expect(sideLabel.tagName).toBe('LABEL');
    expect(paymentLabel.tagName).toBe('LABEL');
    expect(amountLabel.tagName).toBe('LABEL');
  });

  it('shows the active inputs (side, payment method, amount tier) in a visible summary', () => {
    renderEstimator(79000);

    const summary = screen.getByText(
      /Base de referencia \(promedio de venta Binance\):/
    );
    const summaryScope = within(summary.parentElement as HTMLElement);
    expect(summaryScope.getByText(/Vender USDT/)).toBeInTheDocument();
    expect(summaryScope.getByText(/Todos/)).toBeInTheDocument();
  });

  it('displays the formatted estimated rate with two decimals', () => {
    renderEstimator(79000);

    const rate = screen.getByTestId('binance-estimator-rate');
    expect(rate.textContent).toMatch(/Bs\.\s*\d+\.\d{2}/);
  });

  it('changing the payment method updates the rendered estimate', async () => {
    const user = userEvent.setup();
    renderEstimator(79000);

    const paymentSelect = screen.getByLabelText('Método de pago');
    await user.selectOptions(paymentSelect, 'mercantil');

    expect(screen.getByTestId('binance-estimator-rate-value').textContent).toBe(
      '788.00'
    );
  });

  it('labels the rate as an estimate and never as a guaranteed execution price', () => {
    renderEstimator(79000);

    const allText = document.body.textContent || '';

    expect(allText).toMatch(/estimaci[oó]n|estimada|simulaci[oó]n|referencia/i);
    expect(allText).not.toMatch(
      /precio exacto|garantizado|garantizada|garant[ií]a de ejecuci[oó]n|exact execution price|guaranteed price/i
    );
  });
});
