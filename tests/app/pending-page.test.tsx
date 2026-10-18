import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PendingPage from '@/app/pending/page';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { PendingItem } from '@/types/pending-item';

jest.mock('@/providers/repository-provider', () => ({
  useRepository: jest.fn(),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/components/ui/suspense-loading', () => ({
  FormLoading: () => null,
}));

jest.mock('@/components/forms/transaction-form', () => ({
  TransactionForm: ({
    prefill,
    onSuccess,
    onClose,
  }: {
    prefill?: { description?: string; amountMinor?: number };
    onSuccess: (transaction: { id: string }) => void;
    onClose: () => void;
  }) => (
    <div data-testid="transaction-form">
      <span data-testid="prefill-description">{prefill?.description}</span>
      <span data-testid="prefill-amount">{String(prefill?.amountMinor)}</span>
      <button type="button" onClick={() => onSuccess({ id: 'tx-1' })}>
        Guardar transacción
      </button>
      <button type="button" onClick={onClose}>
        Cerrar formulario
      </button>
    </div>
  ),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

function makeItem(
  overrides: Partial<PendingItem> & Pick<PendingItem, 'id' | 'kind' | 'name'>
): PendingItem {
  return {
    userId: 'user-1',
    amountBaseMinor: null,
    done: false,
    doneAt: null,
    convertedTransactionId: null,
    createdAt: new Date('2026-10-01T10:00:00Z').toISOString(),
    ...overrides,
  };
}

function setupRepository(items: PendingItem[]) {
  const repository = {
    pendingItems: {
      findByUser: jest.fn().mockResolvedValue(items),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteCompleted: jest.fn().mockResolvedValue(undefined),
    },
  };
  (useRepository as jest.Mock).mockReturnValue(repository);
  return repository;
}

describe('PendingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
  });

  const items = [
    makeItem({
      id: 'p1',
      kind: 'purchase',
      name: 'Leche',
      amountBaseMinor: 350,
    }),
    makeItem({
      id: 'p2',
      kind: 'purchase',
      name: 'Detergente',
      done: true,
      doneAt: new Date().toISOString(),
    }),
    makeItem({
      id: 'y1',
      kind: 'payment',
      name: 'Suscripción X',
      amountBaseMinor: 2000,
    }),
    makeItem({
      id: 'y2',
      kind: 'payment',
      name: 'Internet',
      done: true,
      doneAt: new Date().toISOString(),
    }),
  ];

  function getSection(title: string): HTMLElement {
    const heading = screen.getByRole('heading', { name: title });
    return heading.closest('section') as HTMLElement;
  }

  it('renders active and completed items in their own checklist', async () => {
    setupRepository(items);

    render(<PendingPage />);

    const purchases = await screen.findByText('Leche');
    expect(purchases).toBeInTheDocument();
    expect(screen.getByText('Suscripción X')).toBeInTheDocument();
    expect(screen.getByText('Detergente')).toBeInTheDocument();
    expect(screen.getByText('Internet')).toBeInTheDocument();
    expect(screen.getAllByText('Completados (1)')).toHaveLength(2);
    expect(screen.getByText('~$3,50')).toBeInTheDocument();
    expect(screen.getByText('~$20,00')).toBeInTheDocument();
  });

  it('adds a purchase with an optional approximate amount', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockResolvedValue(
      makeItem({
        id: 'p3',
        kind: 'purchase',
        name: 'Café',
        amountBaseMinor: 2000,
      })
    );

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      'Café'
    );
    await userEvent.type(
      within(purchases).getByLabelText('Importe aproximado (opcional)'),
      '20'
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    await waitFor(() => {
      expect(repository.pendingItems.create).toHaveBeenCalledWith('user-1', {
        kind: 'purchase',
        name: 'Café',
        amountBaseMinor: 2000,
      });
    });
    expect(await screen.findByText('Café')).toBeInTheDocument();
  });

  it('marks an item as done with a single tap', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.update.mockResolvedValue({
      ...items[0],
      done: true,
      doneAt: new Date().toISOString(),
    });

    render(<PendingPage />);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Marcar "Leche" como comprado',
      })
    );

    await waitFor(() => {
      expect(repository.pendingItems.update).toHaveBeenCalledWith('p1', {
        done: true,
      });
    });
    expect(toast.success).toHaveBeenCalledWith('Comprado ✓');
    expect(await screen.findByText('Completados (2)')).toBeInTheDocument();
  });

  it('deletes an item in one tap', async () => {
    const repository = setupRepository(items);

    render(<PendingPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Eliminar "Leche"' })
    );

    await waitFor(() => {
      expect(repository.pendingItems.delete).toHaveBeenCalledWith('p1');
    });
    await waitFor(() => {
      expect(screen.queryByText('Leche')).not.toBeInTheDocument();
    });
  });

  it('clears only completed payments when asked', async () => {
    const repository = setupRepository(items);

    render(<PendingPage />);

    await screen.findByText('Leche');

    const payments = getSection('Pagos pendientes');
    await userEvent.click(
      within(payments).getByRole('button', { name: 'Limpiar' })
    );

    await waitFor(() => {
      expect(repository.pendingItems.deleteCompleted).toHaveBeenCalledWith(
        'user-1',
        'payment'
      );
    });
    await waitFor(() => {
      expect(screen.queryByText('Internet')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Detergente')).toBeInTheDocument();
  });

  // ===== Adversarial battery (tsp test-plan-pending-items · t5) =====
  // Each test pins one input class or fault path from the L0 contract table.

  it('rolls back the optimistic toggle when the update fails', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.update.mockRejectedValueOnce(
      new Error('network down')
    );

    render(<PendingPage />);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Marcar "Leche" como comprado',
      })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No se pudo actualizar');
    });
    // The item is back in the active list and the completed count is untouched.
    expect(
      screen.getByRole('button', { name: 'Marcar "Leche" como comprado' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Completados (1)')).toHaveLength(2);
  });

  it('returns a completed item to pending on undo and does not celebrate it', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.update.mockResolvedValue({
      ...items[1],
      done: false,
      doneAt: null,
    });

    render(<PendingPage />);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Devolver "Detergente" a pendientes',
      })
    );

    await waitFor(() => {
      expect(repository.pendingItems.update).toHaveBeenCalledWith('p2', {
        done: false,
      });
    });
    expect(
      await screen.findByRole('button', {
        name: 'Marcar "Detergente" como comprado',
      })
    ).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('adds the item without amount and informs when the amount is unreadable', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockResolvedValue(
      makeItem({ id: 'p9', kind: 'purchase', name: 'Cosa rara' })
    );

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      'Cosa rara'
    );
    await userEvent.type(
      within(purchases).getByLabelText('Importe aproximado (opcional)'),
      'abc'
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    await waitFor(() => {
      expect(repository.pendingItems.create).toHaveBeenCalledWith('user-1', {
        kind: 'purchase',
        name: 'Cosa rara',
        amountBaseMinor: null,
      });
    });
    expect(toast.info).toHaveBeenCalledWith(
      'No pude leer el monto "abc" — lo agrego sin importe'
    );
    expect(await screen.findByText('Cosa rara')).toBeInTheDocument();
  });

  it('treats a dot as a thousands separator (1.234 → 1234 USD)', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockResolvedValue(
      makeItem({ id: 'p12', kind: 'purchase', name: 'Televisor' })
    );

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      'Televisor'
    );
    await userEvent.type(
      within(purchases).getByLabelText('Importe aproximado (opcional)'),
      '1.234'
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    // es-ES reads 1.234 as one thousand two hundred thirty four — storing
    // it as ~$1,23 would corrupt the amount by a factor of 1000.
    await waitFor(() => {
      expect(repository.pendingItems.create).toHaveBeenCalledWith('user-1', {
        kind: 'purchase',
        name: 'Televisor',
        amountBaseMinor: 123400,
      });
    });
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('accepts the es-ES decimal comma (1,5 → 1.5 USD)', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockResolvedValue(
      makeItem({ id: 'p13', kind: 'purchase', name: 'Medio' })
    );

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      'Medio'
    );
    await userEvent.type(
      within(purchases).getByLabelText('Importe aproximado (opcional)'),
      '1,5'
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    await waitFor(() => {
      expect(repository.pendingItems.create).toHaveBeenCalledWith('user-1', {
        kind: 'purchase',
        name: 'Medio',
        amountBaseMinor: 150,
      });
    });
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('rejects comma + 3 digits (1,234 → added without amount)', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockResolvedValue(
      makeItem({ id: 'p15', kind: 'purchase', name: 'Miles coma' })
    );

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      'Miles coma'
    );
    await userEvent.type(
      within(purchases).getByLabelText('Importe aproximado (opcional)'),
      '1,234'
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    // "1,234" is a mistyped thousands group, not $1.23 — silent truncation
    // would corrupt the amount by a factor of 1000.
    await waitFor(() => {
      expect(repository.pendingItems.create).toHaveBeenCalledWith('user-1', {
        kind: 'purchase',
        name: 'Miles coma',
        amountBaseMinor: null,
      });
    });
    expect(toast.info).toHaveBeenCalledWith(
      'No pude leer el monto "1,234" — lo agrego sin importe'
    );
  });

  it('rejects multiple commas (1,5,5 → added without amount)', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockResolvedValue(
      makeItem({ id: 'p16', kind: 'purchase', name: 'Doble coma' })
    );

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      'Doble coma'
    );
    await userEvent.type(
      within(purchases).getByLabelText('Importe aproximado (opcional)'),
      '1,5,5'
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    // parseFloat silently reads "1,5,5" as 1.5 — garbage must not become money.
    await waitFor(() => {
      expect(repository.pendingItems.create).toHaveBeenCalledWith('user-1', {
        kind: 'purchase',
        name: 'Doble coma',
        amountBaseMinor: null,
      });
    });
    expect(toast.info).toHaveBeenCalledWith(
      'No pude leer el monto "1,5,5" — lo agrego sin importe'
    );
  });

  it('rejects space-grouped amounts (1 234 → added without amount)', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockResolvedValue(
      makeItem({ id: 'p17', kind: 'purchase', name: 'Espacio miles' })
    );

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      'Espacio miles'
    );
    await userEvent.type(
      within(purchases).getByLabelText('Importe aproximado (opcional)'),
      '1 234'
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    // parseFloat silently reads "1 234" as 1 — space grouping must not
    // become a 1000x-smaller amount.
    await waitFor(() => {
      expect(repository.pendingItems.create).toHaveBeenCalledWith('user-1', {
        kind: 'purchase',
        name: 'Espacio miles',
        amountBaseMinor: null,
      });
    });
    expect(toast.info).toHaveBeenCalledWith(
      'No pude leer el monto "1 234" — lo agrego sin importe'
    );
  });

  it('rejects an ambiguous one-decimal dot (1.2 → added without amount)', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockResolvedValue(
      makeItem({ id: 'p14', kind: 'purchase', name: 'Ambiguo' })
    );

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      'Ambiguo'
    );
    await userEvent.type(
      within(purchases).getByLabelText('Importe aproximado (opcional)'),
      '1.2'
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    // "1.2" is ambiguous in es-ES (1,2? 1.20? 1200?): never guess with money.
    await waitFor(() => {
      expect(repository.pendingItems.create).toHaveBeenCalledWith('user-1', {
        kind: 'purchase',
        name: 'Ambiguo',
        amountBaseMinor: null,
      });
    });
    expect(toast.info).toHaveBeenCalledWith(
      'No pude leer el monto "1.2" — lo agrego sin importe'
    );
  });

  it('parses decimal comma amounts (20,5 → 2050 minor units)', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockResolvedValue(
      makeItem({ id: 'p10', kind: 'purchase', name: 'Pan' })
    );

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      'Pan'
    );
    await userEvent.type(
      within(purchases).getByLabelText('Importe aproximado (opcional)'),
      '20,5'
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    await waitFor(() => {
      expect(repository.pendingItems.create).toHaveBeenCalledWith('user-1', {
        kind: 'purchase',
        name: 'Pan',
        amountBaseMinor: 2050,
      });
    });
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('truncates names beyond the 200-character boundary', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockResolvedValue(
      makeItem({ id: 'p11', kind: 'purchase', name: 'Largo' })
    );

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    const longName = 'x'.repeat(250);
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      longName
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    await waitFor(() => {
      expect(repository.pendingItems.create).toHaveBeenCalledTimes(1);
    });
    const call = repository.pendingItems.create.mock.calls[0][1] as {
      name: string;
    };
    expect(call.name).toHaveLength(200);
  });

  it('restores the item in place when the delete fails', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.delete.mockRejectedValueOnce(
      new Error('network down')
    );

    render(<PendingPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Eliminar "Leche"' })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No se pudo eliminar');
    });
    expect(await screen.findByText('Leche')).toBeInTheDocument();
  });

  it('propagates the stored amount into the transaction prefill on conversion', async () => {
    const completedWithAmount = makeItem({
      id: 'y3',
      kind: 'payment',
      name: 'Seguro',
      amountBaseMinor: 1500,
      done: true,
      doneAt: new Date().toISOString(),
    });
    const repository = setupRepository([...items, completedWithAmount]);
    repository.pendingItems.update.mockResolvedValue({
      ...completedWithAmount,
      convertedTransactionId: 'tx-1',
    });

    render(<PendingPage />);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Registrar "Seguro" como transacción',
      })
    );

    expect(await screen.findByTestId('transaction-form')).toBeInTheDocument();
    expect(screen.getByTestId('prefill-description')).toHaveTextContent(
      'Seguro'
    );
    expect(screen.getByTestId('prefill-amount')).toHaveTextContent('1500');
  });

  it('reports the failure when creating an item rejects', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.create.mockRejectedValueOnce(new Error('boom'));

    render(<PendingPage />);

    await screen.findByText('Leche');

    const purchases = getSection('Compras pendientes');
    await userEvent.type(
      within(purchases).getByLabelText('Agregar a Compras pendientes'),
      'Falla'
    );
    await userEvent.click(
      within(purchases).getByRole('button', {
        name: 'Añadir a Compras pendientes',
      })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'No se pudo agregar el elemento'
      );
    });
    expect(screen.queryByText('Falla')).not.toBeInTheDocument();
  });

  it('links the created transaction when registering a completed item', async () => {
    const repository = setupRepository(items);
    repository.pendingItems.update.mockResolvedValue({
      ...items[1],
      convertedTransactionId: 'tx-1',
    });

    render(<PendingPage />);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Registrar "Detergente" como transacción',
      })
    );

    expect(await screen.findByTestId('transaction-form')).toBeInTheDocument();
    expect(screen.getByTestId('prefill-description')).toHaveTextContent(
      'Detergente'
    );

    await userEvent.click(screen.getByText('Guardar transacción'));

    await waitFor(() => {
      expect(repository.pendingItems.update).toHaveBeenCalledWith('p2', {
        convertedTransactionId: 'tx-1',
      });
    });
    expect(await screen.findByText('Registrado')).toBeInTheDocument();
  });

  // ===== L5 sequence probe — hypothesis 2 (double conversion) =====
  // The transaction is created BEFORE the item is linked to it. If the link
  // update rejects, the item stays convertible and a second attempt books a
  // second transaction. This probe pins the observable sequence (one
  // transaction per save, window still open after a failed link) so the
  // product decision is judged against a real red/green, not prose.
  it('pins the double-booking window when the post-transaction link fails', async () => {
    const repository = setupRepository(items);
    const linkedTransactionIds: string[] = [];
    repository.pendingItems.update.mockImplementation(
      async (
        _id: string,
        patch: { convertedTransactionId?: string | null }
      ) => {
        if (patch.convertedTransactionId != null) {
          linkedTransactionIds.push(patch.convertedTransactionId);
          // First link attempt fails AFTER the transaction exists — the
          // exact sequence of hypothesis 2. The retry succeeds.
          if (linkedTransactionIds.length === 1) {
            throw new Error('network down after transaction creation');
          }
          return {
            ...items[1],
            convertedTransactionId: patch.convertedTransactionId,
          };
        }
        return items[1];
      }
    );

    render(<PendingPage />);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Registrar "Detergente" como transacción',
      })
    );
    expect(await screen.findByTestId('transaction-form')).toBeInTheDocument();

    // First save: transaction created, link update fails.
    await userEvent.click(screen.getByText('Guardar transacción'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'La transacción se creó pero no se pudo marcar el item'
      );
    });
    // Exactly one transaction exists while the item is still unlinked.
    expect(linkedTransactionIds).toHaveLength(1);

    // The item is still convertible: the product-facing double-booking
    // window is real and observable.
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Registrar "Detergente" como transacción',
      })
    );
    expect(await screen.findByTestId('transaction-form')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Guardar transacción'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Registrado en tus transacciones'
      );
    });
    expect(await screen.findByText('Registrado')).toBeInTheDocument();

    // Pinned contract: one conversion flow produced TWO transactions when
    // the first link failed — the window documented for the product
    // decision (hypothesis 2 in the plan).
    expect(linkedTransactionIds).toHaveLength(2);
  });
});
