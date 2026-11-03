import { render, screen } from '@testing-library/react';
import { ChatMessage } from '@/components/ai/chat-message';
import type { UIMessage } from 'ai';

describe('ChatMessage — tool-createTransaction rendering', () => {
  it('renders TransactionCard for successful createTransaction tool output', () => {
    const message: UIMessage = {
      id: 'msg-1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-createTransaction',
          state: 'output-available',
          output: {
            status: 'success',
            transaction: {
              id: 'tx-123',
              description: 'Compras semanales',
              amountMinor: 8500,
              currencyCode: 'USD',
              type: 'EXPENSE',
              categoryName: 'Supermercado',
              accountName: 'Banesco',
              date: '2026-11-03',
            },
          },
        } as any,
      ],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Compras semanales')).toBeInTheDocument();
    expect(screen.getByText('-$85.00')).toBeInTheDocument();
    expect(screen.getByText('Banesco')).toBeInTheDocument();
    expect(screen.getByText(/Supermercado/)).toBeInTheDocument();
    expect(screen.getByText('Gasto registrado')).toBeInTheDocument();
  });

  it('renders safe error box when createTransaction output status is error', () => {
    const message: UIMessage = {
      id: 'msg-2',
      role: 'assistant',
      parts: [
        {
          type: 'tool-createTransaction',
          state: 'output-available',
          output: {
            status: 'error',
            message: 'No se pudo crear la transacción en la cuenta.',
          },
        } as any,
      ],
    };

    render(<ChatMessage message={message} />);

    expect(
      screen.getByText('No se pudo crear la transacción en la cuenta.')
    ).toBeInTheDocument();
  });

  it('falls back to generic tool display for malformed createTransaction output', () => {
    const message: UIMessage = {
      id: 'msg-3',
      role: 'assistant',
      parts: [
        {
          type: 'tool-createTransaction',
          state: 'output-available',
          output: 'Gasto registrado en texto plano',
        } as any,
      ],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('createTransaction')).toBeInTheDocument();
    expect(
      screen.getByText('Gasto registrado en texto plano')
    ).toBeInTheDocument();
  });
});
