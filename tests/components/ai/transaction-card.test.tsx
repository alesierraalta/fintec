import { render, screen } from '@testing-library/react';
import { TransactionCard } from '@/components/ai/transaction-card';

describe('TransactionCard', () => {
  it('renders expense transaction with correct formatting and account details', () => {
    render(
      <TransactionCard
        transaction={{
          id: 'tx-1',
          description: 'Café con amigos',
          amountMinor: 1550,
          currencyCode: 'USD',
          type: 'EXPENSE',
          categoryName: 'Comida',
          accountName: 'Cartera',
          date: '2026-11-03',
        }}
      />
    );

    expect(screen.getByText('Café con amigos')).toBeInTheDocument();
    expect(screen.getByText('-$15.50')).toBeInTheDocument();
    expect(screen.getByText('Cartera')).toBeInTheDocument();
    expect(screen.getByText(/Comida/)).toBeInTheDocument();
    expect(screen.getByText('Gasto registrado')).toBeInTheDocument();
  });

  it('renders income transaction with positive amount and income badge', () => {
    render(
      <TransactionCard
        transaction={{
          id: 'tx-2',
          description: 'Pago de nómina',
          amountMinor: 250000,
          currencyCode: 'USD',
          type: 'INCOME',
          categoryName: 'Salario',
          accountName: 'Banco Banesco',
          date: '2026-11-03',
        }}
      />
    );

    expect(screen.getByText('Pago de nómina')).toBeInTheDocument();
    expect(screen.getByText('+$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('Banco Banesco')).toBeInTheDocument();
    expect(screen.getByText(/Salario/)).toBeInTheDocument();
    expect(screen.getByText('Ingreso registrado')).toBeInTheDocument();
  });
});
