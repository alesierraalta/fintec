import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock framer-motion to avoid AnimatePresence timing issues in jsdom
jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, ...props }, ref) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )
    ),
  },
}));

import { GoalForm } from '@/components/forms/goal-form';
import type { Account, AccountType, SavingsGoal } from '@/types';

const realAccounts: Pick<Account, 'id' | 'name' | 'type'>[] = [
  { id: 'acc_abc123', name: 'Cuenta Real', type: 'BANK' as AccountType },
  { id: 'acc_def456', name: 'Efectivo Real', type: 'CASH' as AccountType },
];

const baseGoal: SavingsGoal = {
  id: 'goal-1',
  name: 'Vacaciones',
  targetBaseMinor: 100000,
  currentBaseMinor: 0,
  active: true,
  accountId: 'acc_abc123',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GoalForm', () => {
  it('renders real account options from the accounts prop (no numeric ids)', async () => {
    render(
      <GoalForm
        isOpen={true}
        onClose={jest.fn()}
        accounts={realAccounts}
        onSave={jest.fn()}
      />
    );

    // Real account labels should be present in the select
    const select = (await screen.findAllByRole('combobox'))[0];
    expect(select).toBeInTheDocument();

    // The select options must contain the real account UUIDs
    const options = Array.from((select as HTMLSelectElement).options).map(
      (o) => o.value
    );
    expect(options).toEqual(
      expect.arrayContaining(['acc_abc123', 'acc_def456'])
    );

    // No mock numeric ids (1,2,3,4) should be present
    expect(options).not.toEqual(expect.arrayContaining(['1', '2', '3', '4']));

    // The labels must show the real account names
    expect(select).toHaveTextContent('Cuenta Real');
    expect(select).toHaveTextContent('Efectivo Real');
  });

  it('shows a single disabled "Sin cuentas disponibles" option when accounts is empty', async () => {
    render(
      <GoalForm
        isOpen={true}
        onClose={jest.fn()}
        accounts={[]}
        onSave={jest.fn()}
      />
    );

    const select = (await screen.findAllByRole('combobox'))[0];
    const options = Array.from((select as HTMLSelectElement).options);

    // Only the empty-state option should be present
    const emptyOption = options.find(
      (o) => o.textContent === 'Sin cuentas disponibles'
    );
    expect(emptyOption).toBeDefined();
    expect(emptyOption!.disabled).toBe(true);
    expect(emptyOption!.value).toBe('');

    // No real accounts should be in the list
    expect(options.length).toBe(1);
  });

  it('keeps the form open when the awaited onSave rejects, then clears loading', async () => {
    const onClose = jest.fn();
    const onSave = jest
      .fn()
      .mockRejectedValue(
        new Error('Failed to create goal: invalid_account_fk')
      );

    const user = userEvent.setup();
    render(
      <GoalForm
        isOpen={true}
        onClose={onClose}
        accounts={realAccounts}
        onSave={onSave}
      />
    );

    // Fill required fields
    const nameInput = screen.getByPlaceholderText(/casa nueva/i);
    await user.type(nameInput, 'Mi meta');
    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '100');

    const submit = screen.getByRole('button', { name: /crear meta/i });
    await user.click(submit);

    // onSave must have been awaited with the goal payload
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    const passedGoal = onSave.mock.calls[0][0] as Partial<SavingsGoal>;
    expect(passedGoal.name).toBe('Mi meta');
    expect(passedGoal.accountId).toBeDefined();

    // onClose must NOT have been called
    expect(onClose).not.toHaveBeenCalled();

    // Submit button must have re-enabled (loading cleared by finally)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /crear meta/i })
      ).not.toBeDisabled();
    });
  });

  it('resets and closes the form when onSave resolves successfully', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn().mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(
      <GoalForm
        isOpen={true}
        onClose={onClose}
        accounts={realAccounts}
        onSave={onSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/casa nueva/i);
    await user.type(nameInput, 'Mi meta');
    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '50');

    await user.click(screen.getByRole('button', { name: /crear meta/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('pre-selects the linked real account when editing a goal', async () => {
    render(
      <GoalForm
        isOpen={true}
        onClose={jest.fn()}
        goal={baseGoal}
        accounts={realAccounts}
        onSave={jest.fn().mockResolvedValue(undefined)}
      />
    );

    const select = (
      await screen.findAllByRole('combobox')
    )[0] as HTMLSelectElement;
    // Wait for the useEffect pre-select to apply
    await waitFor(() => {
      expect(select.value).toBe('acc_abc123');
    });
  });
});
