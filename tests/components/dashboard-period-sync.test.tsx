import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DashboardPeriodControllerProps } from '@/components/dashboard/dashboard-period-props';

let isMobile = false;
jest.mock('@/contexts/sidebar-context', () => ({
  useSidebar: () => ({ isMobile }),
}));

function DashboardSurface({
  period,
  referenceNow,
  onPeriodChange,
}: DashboardPeriodControllerProps) {
  return (
    <div data-testid="dashboard-surface">
      {(['today', 'this_week', 'this_month', 'last_month', 'all'] as const).map(
        (option) => (
          <button
            key={option}
            type="button"
            onClick={() => onPeriodChange(option)}
          >
            {option}
          </button>
        )
      )}
      {[
        ['lazy-spending-chart', period, referenceNow],
        ['income-sources', period, referenceNow],
      ].map(([testId, currentPeriod, now]) => (
        <div
          key={testId}
          data-testid={testId}
          data-period={currentPeriod}
          data-reference-now={now.toISOString()}
        />
      ))}
    </div>
  );
}

jest.mock('@/components/dashboard/desktop-dashboard', () => ({
  DesktopDashboard: DashboardSurface,
}));
jest.mock('@/components/dashboard/mobile-dashboard', () => ({
  MobileDashboard: DashboardSurface,
}));

import { DashboardContent } from '@/components/dashboard/dashboard-content';

describe('DashboardContent period synchronization', () => {
  beforeEach(() => {
    isMobile = false;
  });

  it('updates both chart consumers from one selector', () => {
    render(<DashboardContent />);
    fireEvent.click(screen.getByRole('button', { name: 'this_week' }));
    expect(screen.getByTestId('lazy-spending-chart')).toHaveAttribute(
      'data-period',
      'this_week'
    );
    expect(screen.getByTestId('income-sources')).toHaveAttribute(
      'data-period',
      'this_week'
    );
  });

  it('preserves the period when switching branches', () => {
    const view = render(<DashboardContent />);
    fireEvent.click(screen.getByRole('button', { name: 'last_month' }));
    isMobile = true;
    view.rerender(<DashboardContent />);
    expect(screen.getByTestId('lazy-spending-chart')).toHaveAttribute(
      'data-period',
      'last_month'
    );
    expect(screen.getByTestId('income-sources')).toHaveAttribute(
      'data-period',
      'last_month'
    );
  });

  it('passes identical period and referenceNow values to both charts', () => {
    render(<DashboardContent />);
    fireEvent.click(screen.getByRole('button', { name: 'today' }));
    const spending = screen.getByTestId('lazy-spending-chart');
    const income = screen.getByTestId('income-sources');
    expect(spending).toHaveAttribute('data-period', 'today');
    expect(spending).toHaveAttribute(
      'data-reference-now',
      income.getAttribute('data-reference-now')
    );
  });
});
