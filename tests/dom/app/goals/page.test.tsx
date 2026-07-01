import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalsPage from '@/app/goals/page';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import { useUI } from '@/hooks';
import { toast } from 'sonner';

jest.mock('@/providers/repository-provider', () => ({
  useRepository: jest.fn(),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-currency-converter', () => ({
  useCurrencyConverter: jest.fn(() => ({
    getRate: () => 1,
  })),
}));

// State holder so individual tests can flip the modal state via the page's
// openModal/closeModal callables without re-mocking the module.
const modalState = { activeModal: null as string | null };

jest.mock('@/hooks', () => ({
  useUI: jest.fn(),
  useModal: jest.fn(() => ({
    isOpen: modalState.activeModal !== null,
    openModal: (id: string) => {
      modalState.activeModal = id;
    },
    closeModal: () => {
      modalState.activeModal = null;
    },
  })),
}));

jest.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/components/ui/floating-action-button', () => ({
  FloatingActionButton: () => null,
}));

jest.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/components/ui/progress-ring', () => ({
  ProgressRing: () => null,
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockAccounts = [
  {
    id: 'acc_abc123',
    name: 'Cuenta Real',
    type: 'BANK',
    userId: 'user-1',
    currencyCode: 'USD',
    balance: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function buildRepository(overrides: Partial<{ createError: Error }> = {}) {
  const create =
    overrides.createError !== undefined
      ? jest.fn().mockRejectedValue(overrides.createError)
      : jest.fn().mockResolvedValue({
          id: 'goal-2',
          name: 'Meta',
          targetBaseMinor: 10000,
          currentBaseMinor: 0,
          active: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        });

  return {
    accounts: {
      findAll: jest.fn().mockResolvedValue(mockAccounts),
    },
    goals: {
      getGoalsWithProgress: jest.fn().mockResolvedValue([]),
      getGoalsSummary: jest.fn().mockResolvedValue(null),
      create,
      update: jest.fn(),
      delete: jest.fn(),
      addContribution: jest.fn(),
      updateGoalProgress: jest.fn(),
    },
  };
}

describe('GoalsPage accounts wiring + error surfacing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      baseCurrency: 'USD',
    });
  });

  it('fetches goals, summary, and accounts in the same Promise.all', async () => {
    modalState.activeModal = null;
    const repository = buildRepository();
    (useRepository as jest.Mock).mockReturnValue(repository);
    (useUI as jest.Mock).mockReturnValue({
      activeModal: null,
      openModal: jest.fn(),
      closeModal: jest.fn(),
    });

    render(<GoalsPage />);

    await waitFor(() => {
      expect(repository.accounts.findAll).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(repository.goals.getGoalsWithProgress).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(repository.goals.getGoalsSummary).toHaveBeenCalledTimes(1);
    });

    // All three were called on the same initial load (Promise.all shared
    // microtask), so each should have been called exactly once.
    expect(repository.accounts.findAll).toHaveBeenCalledTimes(1);
    expect(repository.goals.getGoalsWithProgress).toHaveBeenCalledTimes(1);
    expect(repository.goals.getGoalsSummary).toHaveBeenCalledTimes(1);
  });

  it('passes accounts to GoalForm so the selector renders real account options', async () => {
    modalState.activeModal = 'new-goal';
    const repository = buildRepository();
    (useRepository as jest.Mock).mockReturnValue(repository);
    (useUI as jest.Mock).mockReturnValue({
      activeModal: 'new-goal',
      openModal: jest.fn(),
      closeModal: jest.fn(),
    });

    render(<GoalsPage />);

    // Wait for loadData to populate accounts state and the dynamic-imported
    // GoalForm to mount (it renders FormLoading first via next/dynamic).
    await waitFor(() => {
      expect(repository.accounts.findAll).toHaveBeenCalled();
    });

    // The page has its own filter select (all/active/completed/overdue).
    // Wait for the form's account combobox to appear — it has the real
    // account UUID as an option value, which the page filter does not.
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      const accountSelect = selects.find((s) =>
        Array.from(s.options).some((o) => o.value === 'acc_abc123')
      );
      expect(accountSelect).toBeDefined();
    });
  });

  it('surfaces repository error.message in the toast when create rejects', async () => {
    modalState.activeModal = 'new-goal';
    const repository = buildRepository({
      createError: new Error('Failed to create goal: invalid_account_fk'),
    });
    (useRepository as jest.Mock).mockReturnValue(repository);
    (useUI as jest.Mock).mockReturnValue({
      activeModal: 'new-goal',
      openModal: jest.fn(),
      closeModal: jest.fn(),
    });

    const user = userEvent.setup();
    render(<GoalsPage />);

    await waitFor(() => {
      expect(repository.accounts.findAll).toHaveBeenCalled();
    });

    // Wait for the form's account combobox to render (has the real account
    // UUID, the page's filter select does not).
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      expect(
        selects.some((s) =>
          Array.from(s.options).some((o) => o.value === 'acc_abc123')
        )
      ).toBe(true);
    });

    await user.type(screen.getByPlaceholderText(/casa nueva/i), 'Mi meta');
    await user.type(screen.getByPlaceholderText('0.00'), '100');

    await user.click(screen.getByRole('button', { name: /crear meta/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to create goal: invalid_account_fk'
      );
    });
    // The generic fallback must NOT have been used.
    const toastCalls = (toast.error as jest.Mock).mock.calls.map(
      (call) => call[0]
    );
    expect(toastCalls).not.toContain('No se pudo guardar la meta');
  });
});
