import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { VesCalculator } from '@/components/currency/ves-calculator';
import type { BCVHistoryRecord } from '@/lib/services/bcv-history-service';
import type { BinanceHistoryRecord } from '@/lib/services/binance-history-service';

jest.mock('framer-motion', () => {
  const passthrough =
    (Element: 'div' | 'button') =>
    ({
      children,
      initial: _initial,
      animate: _animate,
      variants: _variants,
      transition: _transition,
      ...rest
    }: Record<string, unknown>) => {
      const Tag = Element as unknown as React.ElementType;
      return <Tag {...rest}>{children as React.ReactNode}</Tag>;
    };

  return {
    motion: {
      div: passthrough('div'),
      button: passthrough('button'),
    },
  };
});

const BCV_RATE: BCVHistoryRecord = {
  id: 1,
  date: '2026-01-15',
  timestamp: '2026-01-15T12:00:00.000Z',
  usd: 36.58,
  eur: 39.21,
  source: 'BCV',
};

const BINANCE_RATE: BinanceHistoryRecord = {
  id: 2,
  date: '2026-01-15',
  timestamp: '2026-01-15T12:00:00.000Z',
  usd: 40.1,
  source: 'Binance',
};

function buildProps(
  overrides: Partial<Parameters<typeof VesCalculator>[0]> = {}
) {
  return {
    bcvRates: [BCV_RATE],
    binanceRates: [BINANCE_RATE],
    selectedBCVRate: BCV_RATE,
    selectedBinanceRate: BINANCE_RATE,
    activeSource: 'BCV' as const,
    onSourceChange: jest.fn(),
    onSelectBCVRate: jest.fn(),
    onSelectBinanceRate: jest.fn(),
    onPickDate: jest.fn(),
    ...overrides,
  };
}

// * The component's source is controlled by the parent; this harness emulates
// the calculator page so source toggles actually update activeSource.
function SourceHarness(props: Parameters<typeof VesCalculator>[0]) {
  const [source, setSource] = React.useState(props.activeSource);
  return (
    <VesCalculator
      {...props}
      activeSource={source}
      onSourceChange={setSource}
    />
  );
}

function getSelectOptions(select: HTMLElement) {
  return Array.from(select.querySelectorAll('option')).map((o) => o.value);
}

describe('VesCalculator', () => {
  it('shows the converter first with only currencies supported by BCV', () => {
    render(<VesCalculator {...buildProps()} />);

    expect(screen.getByText('Calculadora de Conversión')).toBeVisible();

    const fromSelect = screen.getByTestId('from-currency');
    const toSelect = screen.getByTestId('to-currency');
    expect(getSelectOptions(fromSelect)).toEqual(['USD', 'VES', 'EUR']);
    // BUSD has no BCV rate and must not be offered
    expect(getSelectOptions(toSelect)).not.toContain('BUSD');
  });

  it('converts USD to VES using the selected BCV rate', () => {
    render(<VesCalculator {...buildProps()} />);

    const amountInput = screen.getByTestId('calculator-amount-input');
    fireEvent.change(amountInput, { target: { value: '2' } });

    const result = screen.getByTestId('calculator-result');
    // 2 * 36.58 = 73.16
    expect(result.textContent).toContain('VES');
    expect(result.textContent).toMatch(/73/);
    expect(result.textContent).toMatch(/16/);
  });

  it('converts EUR to USD with the BCV cross rate', () => {
    render(<VesCalculator {...buildProps()} />);

    fireEvent.change(screen.getByTestId('from-currency'), {
      target: { value: 'EUR' },
    });
    fireEvent.change(screen.getByTestId('to-currency'), {
      target: { value: 'USD' },
    });

    const result = screen.getByTestId('calculator-result');
    // 1 EUR ≈ 39.21 / 36.58 ≈ 1.07 USD (EUR is worth more than USD here)
    expect(result.textContent).toContain('USD');
    expect(result.textContent).toMatch(/1[.,]\s?07/);
  });

  it('restricts currencies when switching source to Binance and remaps unsupported selection', () => {
    render(<SourceHarness {...buildProps()} />);

    // Pick an EUR pair under BCV
    fireEvent.change(screen.getByTestId('from-currency'), {
      target: { value: 'EUR' },
    });
    expect(screen.getByTestId('from-currency')).toHaveValue('EUR');

    // Switch source to Binance: EUR is unsupported there
    fireEvent.click(screen.getByRole('button', { name: 'Usar tasa Binance' }));

    const fromSelect = screen.getByTestId('from-currency');
    expect(getSelectOptions(fromSelect)).toEqual(['USD', 'VES', 'BUSD']);
    expect(fromSelect).toHaveValue('USD');

    const toSelect = screen.getByTestId('to-currency');
    expect(getSelectOptions(toSelect)).not.toContain('EUR');
  });

  it('converts USD to VES using the Binance rate after switching source', () => {
    render(<SourceHarness {...buildProps()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Usar tasa Binance' }));
    fireEvent.change(screen.getByTestId('calculator-amount-input'), {
      target: { value: '2' },
    });

    const result = screen.getByTestId('calculator-result');
    // 2 * 40.10 = 80.20
    expect(result.textContent).toMatch(/80/);
    expect(result.textContent).toMatch(/2[0]/);
  });

  it('never offers USD to BUSD pairs under Binance (dollar twins)', () => {
    render(<VesCalculator {...buildProps()} activeSource="Binance" />);

    const fromSelect = screen.getByTestId('from-currency');
    expect(getSelectOptions(fromSelect)).toEqual(['USD', 'VES', 'BUSD']);

    // With USD origin, destination can only be VES
    fireEvent.change(fromSelect, { target: { value: 'USD' } });
    expect(getSelectOptions(screen.getByTestId('to-currency'))).toEqual([
      'VES',
    ]);

    // With VES origin, both dollar options are available
    fireEvent.change(fromSelect, { target: { value: 'VES' } });
    expect(getSelectOptions(screen.getByTestId('to-currency'))).toEqual([
      'USD',
      'BUSD',
    ]);
  });

  it('swaps currencies keeping a valid pair', () => {
    render(<VesCalculator {...buildProps()} />);

    fireEvent.change(screen.getByTestId('from-currency'), {
      target: { value: 'EUR' },
    });
    fireEvent.change(screen.getByTestId('to-currency'), {
      target: { value: 'VES' },
    });

    fireEvent.click(screen.getByTestId('swap-button'));

    expect(screen.getByTestId('from-currency')).toHaveValue('VES');
    expect(screen.getByTestId('to-currency')).toHaveValue('EUR');
  });

  it('labels the applied rate source next to the result', () => {
    render(<SourceHarness {...buildProps()} />);

    const status = screen.getByTestId('applied-rate-line');
    expect(status.textContent).toContain('BCV');

    fireEvent.click(screen.getByRole('button', { name: 'Usar tasa Binance' }));
    expect(screen.getByTestId('applied-rate-line').textContent).toContain(
      'Binance'
    );
  });

  it('keeps the recent rates picker below the converter', () => {
    render(<VesCalculator {...buildProps()} />);

    const converterCard = screen.getByTestId('converter-card');
    const recentSection = screen.getByTestId('rate-history-section');
    expect(
      within(converterCard).getByText('Calculadora de Conversión')
    ).toBeVisible();
    expect(within(recentSection).getByText('Tasas recientes')).toBeVisible();
  });
});
