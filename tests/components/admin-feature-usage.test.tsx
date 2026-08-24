import { render, screen } from '@testing-library/react';
import { AdminFeatureUsage } from '@/components/admin/admin-feature-usage';

const base = {
  status: 'available' as const,
  window: '30d' as const,
  items: [
    {
      key: 'transactions_created',
      status: 'available' as const,
      source: 'transactions.created_at',
      basis: 'selected_window' as const,
      count: 3,
    },
    {
      key: 'ai_messages',
      status: 'unavailable' as const,
      source: 'ai_conversation_messages.created_at',
      basis: 'selected_window' as const,
      reason: 'source_unavailable',
    },
  ],
  monthlyCounters: {
    status: 'empty' as const,
    source: 'usage_tracking' as const,
    basis: 'month_based' as const,
    items: [],
  },
};

describe('AdminFeatureUsage', () => {
  it('renders an accessible aggregate feature usage section with provenance', () => {
    render(<AdminFeatureUsage featureUsage={base} />);
    expect(
      screen.getByRole('heading', { name: 'Uso por funcionalidad' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /uso agregado/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no representa telemetría completa/i)
    ).toBeInTheDocument();
  });
  it('labels unavailable families without plotting fabricated zeroes', () => {
    render(<AdminFeatureUsage featureUsage={base} />);
    expect(screen.getByText('No disponible')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
