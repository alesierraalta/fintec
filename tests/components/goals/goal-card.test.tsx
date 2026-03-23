import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalCard } from '@/components/goals/goal-card';
import type { SavingsGoal } from '@/types';

const baseGoal: SavingsGoal = {
  id: 'goal-1',
  name: 'Fondo de emergencia',
  targetBaseMinor: 10000,
  currentBaseMinor: 2500,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GoalCard', () => {
  it('shows manual contribution CTA for manual goals', async () => {
    const user = userEvent.setup();
    const addMoney = jest.fn();

    render(<GoalCard goal={baseGoal} onAddMoney={addMoney} />);

    await user.click(screen.getByRole('button', { name: /agregar dinero/i }));
    expect(addMoney).toHaveBeenCalledWith('goal-1');
    expect(
      screen.queryByRole('button', { name: /refrescar progreso/i })
    ).not.toBeInTheDocument();
  });

  it('shows refresh CTA and disables manual contribution for linked-account goals', () => {
    render(
      <GoalCard
        goal={{ ...baseGoal, accountId: 'acc-1' }}
        onAddMoney={jest.fn()}
        onRefreshProgress={jest.fn()}
        isRefreshing={true}
      />
    );

    expect(
      screen.queryByRole('button', { name: /agregar dinero/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/los aportes manuales están deshabilitados/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /actualizando/i })
    ).toBeDisabled();
  });
});
