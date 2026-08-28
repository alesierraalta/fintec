'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  trackLandingEvent,
  type LandingEventName,
  type LandingEventProperties,
} from '@/lib/analytics/landing-events';

type TrackedLandingLinkProps = {
  href: string;
  eventName: LandingEventName;
  properties?: LandingEventProperties;
  className?: string;
  children: ReactNode;
};

export function TrackedLandingLink({
  href,
  eventName,
  properties,
  className,
  children,
}: TrackedLandingLinkProps) {
  return (
    <Link
      href={href}
      onClick={() => trackLandingEvent(eventName, properties)}
      className={className}
    >
      {children}
    </Link>
  );
}
