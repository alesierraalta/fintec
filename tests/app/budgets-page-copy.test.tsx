import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BudgetsPage from '@/app/budgets/page';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

jest.mock('@/providers/repository-provider', () => ({
  useRepository: jest.fn(),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks', () => ({
  useModal: () => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  }),
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

jest.mock('@/components/budgets', () => ({
  BudgetCard: ({ budget }: { budget: { id: string } }) => (
    <div>{budget.id}</div>
  ),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('BudgetsPage copy previous month CTA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
  });

  it('copies missing budgets and shows copied/skipped feedback', async () => {
    const repository = {
      budgets: {
        getBudgetsWithProgress: jest.fn().mockResolvedValue([]),
        getMonthlyBudgetSummary: jest.fn().mockResolvedValue({
          totalBudgetBaseMinor: 0,
          totalSpentBaseMinor: 0,
          totalRemainingBaseMinor: 0,
          overBudgetCount: 0,
          budgetsCount: 0,
        }),
        findByMonthYear: jest.fn().mockResolvedValue([
          { id: 'b1', categoryId: 'cat-1', amountBaseMinor: 1000 },
          { id: 'b2', categoryId: 'cat-2', amountBaseMinor: 2000 },
        ]),
        copyBudgetsToNextMonth: jest
          .fn()
          .mockResolvedValue([
            { id: 'b3', categoryId: 'cat-1', amountBaseMinor: 1000 },
          ]),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      categories: {
        findAll: jest.fn().mockResolvedValue([]),
      },
    };

    (useRepository as jest.Mock).mockReturnValue(repository);

    render(<BudgetsPage />);

    const button = await screen.findByRole('button', {
      name: /copiar presupuestos del mes anterior/i,
    });
    await userEvent.click(button);

    await waitFor(() => {
      expect(repository.budgets.copyBudgetsToNextMonth).toHaveBeenCalledTimes(
        1
      );
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Copiados 1 presupuesto; 1 omitido'
    );
  });

  it('reports when there is no previous month source to copy', async () => {
    const repository = {
      budgets: {
        getBudgetsWithProgress: jest.fn().mockResolvedValue([]),
        getMonthlyBudgetSummary: jest.fn().mockResolvedValue({
          totalBudgetBaseMinor: 0,
          totalSpentBaseMinor: 0,
          totalRemainingBaseMinor: 0,
          overBudgetCount: 0,
          budgetsCount: 0,
        }),
        findByMonthYear: jest.fn().mockResolvedValue([]),
        copyBudgetsToNextMonth: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      categories: {
        findAll: jest.fn().mockResolvedValue([]),
      },
    };

    (useRepository as jest.Mock).mockReturnValue(repository);

    render(<BudgetsPage />);

    const button = await screen.findByRole('button', {
      name: /copiar presupuestos del mes anterior/i,
    });
    await userEvent.click(button);

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        'El mes anterior no tiene presupuestos para copiar'
      );
    });
    expect(repository.budgets.copyBudgetsToNextMonth).not.toHaveBeenCalled();
  });
});
