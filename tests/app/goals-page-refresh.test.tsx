import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalsPage from '@/app/goals/page';
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

describe('GoalsPage refresh flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
  });

  it('refreshes a linked goal and shows success feedback', async () => {
    const repository = {
      goals: {
        getGoalsWithProgress: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'goal-1',
              name: 'Meta vinculada',
              targetBaseMinor: 10000,
              currentBaseMinor: 2000,
              accountId: 'acc-1',
              active: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'goal-1',
              name: 'Meta vinculada',
              targetBaseMinor: 10000,
              currentBaseMinor: 5000,
              accountId: 'acc-1',
              active: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ]),
        getGoalsSummary: jest
          .fn()
          .mockResolvedValueOnce({
            totalGoals: 1,
            activeGoals: 1,
            completedGoals: 0,
            totalTargetBaseMinor: 10000,
            totalSavedBaseMinor: 2000,
            averageProgress: 20,
          })
          .mockResolvedValueOnce({
            totalGoals: 1,
            activeGoals: 1,
            completedGoals: 0,
            totalTargetBaseMinor: 10000,
            totalSavedBaseMinor: 5000,
            averageProgress: 50,
          }),
        updateGoalProgress: jest.fn().mockResolvedValue(undefined),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        addContribution: jest.fn(),
      },
    };

    (useRepository as jest.Mock).mockReturnValue(repository);

    render(<GoalsPage />);

    const refreshButton = await screen.findByRole('button', {
      name: /refrescar progreso/i,
    });

    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(repository.goals.updateGoalProgress).toHaveBeenCalledWith(
        'goal-1'
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Progreso refrescado correctamente'
      );
    });
  });
});
