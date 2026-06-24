import { render, screen } from '@testing-library/react';
import { RateBadge } from '@/components/accounts/rate-badge';

describe('RateBadge', () => {
  it('renders the source name and value', () => {
    render(<RateBadge source="bcv_usd" value={36.5} />);
    const badge = screen.getByTestId('rate-badge');
    expect(badge).toHaveTextContent('BCV USD');
    expect(badge).toHaveTextContent('36.50');
    expect(badge).toHaveTextContent('VES');
  });

  it('formats to 2 decimal places', () => {
    render(<RateBadge source="binance" value={37.123456} />);
    const badge = screen.getByTestId('rate-badge');
    expect(badge).toHaveTextContent('37.12');
  });

  it('supports custom currency', () => {
    render(<RateBadge source="bcv_usd" value={1.05} currency="USD" />);
    const badge = screen.getByTestId('rate-badge');
    expect(badge).toHaveTextContent('USD');
    expect(badge).toHaveTextContent('1.05');
  });
});
