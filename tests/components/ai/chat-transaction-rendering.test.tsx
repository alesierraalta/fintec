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

  it('renders sleek status chip for tool-queryTransactions', () => {
    const message: UIMessage = {
      id: 'msg-4',
      role: 'assistant',
      parts: [
        {
          type: 'tool-queryTransactions',
          state: 'output-available',
          output: '📊 Total: $500.00\n📄 Transacciones consideradas: 5',
        } as any,
      ],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Transacciones consultadas')).toBeInTheDocument();
  });

  it('renders sleek status chip for tool-searchTransactions', () => {
    const message: UIMessage = {
      id: 'msg-5',
      role: 'assistant',
      parts: [
        {
          type: 'tool-searchTransactions',
          state: 'output-available',
          output: '• 01 Ene 2026 | 🍽️ Cena | -$40.00',
        } as any,
      ],
    };

    render(<ChatMessage message={message} />);

    expect(
      screen.getByText('Búsqueda de transacciones realizada')
    ).toBeInTheDocument();
  });

  it('renders a notice or fallback when assistant message only has tool chips and no text response', () => {
    const message: UIMessage = {
      id: 'msg-6',
      role: 'assistant',
      parts: [
        {
          type: 'tool-queryTransactions',
          state: 'output-available',
          output: '📊 Total: $500.00',
        } as any,
        {
          type: 'tool-queryTransactions',
          state: 'output-available',
          output: '📊 Total: $1200.00',
        } as any,
      ],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getAllByText('Transacciones consultadas')).toHaveLength(2);
    expect(screen.getByTestId('chat-tool-only-notice')).toBeInTheDocument();
  });
});
