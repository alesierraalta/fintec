/**
 * #118: chat cards of design 01 ("Conversación con tarjetas") act on the
 * user's data only through the injected chat actions.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ChatActionsContext,
  type ChatActions,
} from '@/components/ai/chat-actions';
import { TransactionCard } from '@/components/ai/transaction-card';
import { ToolResult } from '@/components/ai/tool-result';
import { PendingReceiptsCard } from '@/components/ai/pending-receipts-card';

function makeActions(over: Partial<ChatActions> = {}): ChatActions {
  return {
    reply: jest.fn(),
    undoTransaction: jest.fn().mockResolvedValue(undefined),
    changeCategory: jest.fn().mockResolvedValue(undefined),
    categories: [
      { id: 'def-food', name: 'Alimentación', kind: 'EXPENSE' },
      { id: 'def-health', name: 'Salud', kind: 'EXPENSE' },
      { id: 'def-salary', name: 'Salario', kind: 'INCOME' },
    ],
    accounts: [
      { id: 'acc-zelle', name: 'Zelle', currencyCode: 'USD' },
      { id: 'acc-banesco', name: 'Banesco', currencyCode: 'VES' },
    ],
    scanReceipt: jest.fn(),
    settlePendingReceipt: jest.fn().mockResolvedValue(undefined),
    ...over,
  };
}

function withActions(ui: React.ReactNode, actions: ChatActions) {
  return render(
    <ChatActionsContext.Provider value={actions}>
      {ui}
    </ChatActionsContext.Provider>
  );
}

const lunch = {
  id: 'tx-1',
  description: 'Almuerzo',
  amountMinor: 1200,
  currencyCode: 'USD',
  type: 'EXPENSE' as const,
  categoryName: 'Carros',
  accountName: 'Zelle',
  date: '2026-11-07',
};

describe('TransactionCard actions', () => {
  it('undoes the movement and stops offering actions', async () => {
    const actions = makeActions();
    withActions(<TransactionCard transaction={lunch} />, actions);

    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));

    expect(actions.undoTransaction).toHaveBeenCalledWith('tx-1');
    expect(await screen.findByText('Movimiento deshecho.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Deshacer' })
    ).not.toBeInTheDocument();
  });

  it('offers only categories of the same kind and applies the chosen one', async () => {
    const actions = makeActions();
    withActions(<TransactionCard transaction={lunch} />, actions);

    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar categoría' })
    );
    const picker = screen.getByRole('group', { name: 'Elegir categoría' });
    expect(
      within(picker).queryByRole('button', { name: 'Salario' })
    ).not.toBeInTheDocument();
    await userEvent.click(
      within(picker).getByRole('button', { name: 'Alimentación' })
    );

    expect(actions.changeCategory).toHaveBeenCalledWith('tx-1', 'def-food');
    await waitFor(() =>
      expect(screen.getByText('Alimentación')).toBeInTheDocument()
    );
    expect(screen.queryByText('Carros')).not.toBeInTheDocument();
  });

  it('is read-only without chat actions', () => {
    render(<TransactionCard transaction={lunch} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ToolResult cards', () => {
  it('turns a clarification into one-tap answers sent as the user', async () => {
    const actions = makeActions();
    withActions(
      <ToolResult
        type="tool-createTransaction"
        output={{
          status: 'needs_clarification',
          field: 'category',
          message: '¿En qué fueron esos 20 $?',
          options: ['Alimentación', 'Transporte'],
        }}
      />,
      actions
    );

    await userEvent.click(screen.getByRole('button', { name: 'Transporte' }));

    expect(actions.reply).toHaveBeenCalledWith('Transporte');
    expect(screen.getByRole('button', { name: 'Alimentación' })).toBeDisabled();
  });

  it('shows a transfer as money moving between own accounts, not as an expense', () => {
    render(
      <ToolResult
        type="tool-createTransfer"
        output={{
          status: 'success',
          transfer: {
            id: 'tr-1',
            fromAccountName: 'Zelle',
            toAccountName: 'Binance',
            fromAmountMinor: 700000,
            toAmountMinor: 700000,
            fromCurrency: 'USD',
            toCurrency: 'USD',
          },
        }}
      />
    );

    const card = screen.getByRole('region', {
      name: 'Transferencia entre tus cuentas',
    });
    expect(within(card).getByText('Zelle')).toBeInTheDocument();
    expect(within(card).getByText('Binance')).toBeInTheDocument();
    expect(
      within(card).getByText('No es un gasto: tu saldo total no cambia.')
    ).toBeInTheDocument();
  });
});

function receipt(over: Record<string, unknown>) {
  return {
    type: 'EXPENSE',
    amount: 18.4,
    currency: 'USD',
    date: '2026-11-07',
    suggestedDescription: 'Farmatodo farmacia',
    formattedNotes: 'Ticket',
    suggestedAccountId: 'acc-zelle',
    suggestedCategoryId: 'def-health',
    accountMatchConfidence: 'HIGH',
    confidence: 'HIGH',
    tags: [],
    ...over,
  };
}

describe('PendingReceiptsCard', () => {
  it('scans uploaded photos, matches each to its expense and records the ready ones', async () => {
    const scanReceipt = jest
      .fn()
      .mockResolvedValueOnce(receipt({}))
      .mockResolvedValueOnce(
        receipt({
          amount: 46.1,
          suggestedDescription: 'Mercado Central Madeirense',
          suggestedCategoryId: 'def-food',
        })
      );
    const actions = makeActions({ scanReceipt });
    withActions(
      <PendingReceiptsCard
        pending={[
          { id: 'p-mkt', name: 'Mercado' },
          { id: 'p-farm', name: 'Farmacia' },
          { id: 'p-3', name: 'Gasto 3' },
        ]}
      />,
      actions
    );

    await userEvent.upload(screen.getByLabelText('Fotos de los tickets'), [
      new File(['a'], 'farmacia.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'mercado.jpg', { type: 'image/jpeg' }),
    ]);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Registrar los 2 listos' })
    );

    await waitFor(() =>
      expect(actions.settlePendingReceipt).toHaveBeenCalledTimes(2)
    );
    expect(actions.settlePendingReceipt).toHaveBeenCalledWith(
      'p-farm',
      expect.objectContaining({
        accountId: 'acc-zelle',
        amountMinor: 1840,
        description: 'Farmacia',
        categoryId: 'def-health',
      })
    );
    expect(actions.settlePendingReceipt).toHaveBeenCalledWith(
      'p-mkt',
      expect.objectContaining({
        amountMinor: 4610,
        description: 'Mercado',
        categoryId: 'def-food',
      })
    );
    expect(await screen.findAllByText('Registrado')).toHaveLength(2);
    // The third expense keeps waiting for its photo.
    expect(screen.getByText('Sin foto todavía')).toBeInTheDocument();
  });

  it('asks for the account when the receipt currency has no matching suggestion', async () => {
    const actions = makeActions({
      scanReceipt: jest
        .fn()
        .mockResolvedValue(
          receipt({
            currency: 'VES',
            amount: 300,
            suggestedAccountId: undefined,
            suggestedDescription: 'Panadería',
          })
        ),
    });
    withActions(
      <PendingReceiptsCard pending={[{ id: 'p-1', name: 'Gasto 1' }]} />,
      actions
    );

    await userEvent.upload(
      screen.getByLabelText('Fotos de los tickets'),
      new File(['a'], 't.jpg', { type: 'image/jpeg' })
    );

    const select = await screen.findByRole('combobox');
    expect(
      screen.queryByRole('button', { name: /Registrar/ })
    ).not.toBeInTheDocument();
    await userEvent.selectOptions(select, 'acc-banesco');
    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar el listo' })
    );

    await waitFor(() =>
      expect(actions.settlePendingReceipt).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({
          accountId: 'acc-banesco',
          currencyCode: 'VES',
          amountMinor: 30000,
          description: 'Panadería',
        })
      )
    );
  });
});
