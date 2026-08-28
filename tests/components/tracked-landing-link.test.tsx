import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackedLandingLink } from '@/app/(public)/components/tracked-landing-link';
import { trackLandingEvent } from '@/lib/analytics/landing-events';

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('@/lib/analytics/landing-events', () => ({
  trackLandingEvent: jest.fn(),
}));

describe('TrackedLandingLink', () => {
  it.each([
    {
      href: '/auth/register',
      eventName: 'landing_hero_cta_click' as const,
      properties: { cta_id: 'hero_primary', destination: '/auth/register' },
      label: 'Crear mi primer presupuesto',
    },
    {
      href: '#tasas-en-vivo',
      eventName: 'rate_cockpit_interaction' as const,
      properties: { interaction: 'hero_rates_link', source: 'BCV' },
      label: 'Ver cómo se consulta la tasa',
    },
  ])('tracks $eventName and preserves $href when clicked', async ({ href, eventName, properties, label }) => {
    const user = userEvent.setup();
    render(
      <TrackedLandingLink
        href={href}
        eventName={eventName}
        properties={properties}
        className="cta"
      >
        {label}
      </TrackedLandingLink>
    );

    const link = screen.getByRole('link', { name: label });
    await user.click(link);

    expect(trackLandingEvent).toHaveBeenCalledWith(eventName, properties);
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveClass('cta');
  });
});
