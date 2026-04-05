import Link from 'next/link';
import { FinTecLogo } from '@/components/branding/fintec-logo';
import { MobileMenuToggle } from './mobile-menu';
import type { NavLink } from './data';

interface LandingNavProps {
  links: NavLink[];
}

export function LandingNav({ links }: LandingNavProps) {
  // Separate mobile-only links from desktop auth links
  const mobileLinks = links;
  const desktopAuthLinks = links.filter(
    (l) => l.href === '/auth/login' || l.href === '/auth/register'
  );

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/20 bg-background/80 pt-safe-top backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" aria-label="FinTec - Inicio">
            <FinTecLogo
              containerClassName="h-16 w-32 sm:h-20 sm:w-40"
              priority
              sizes="(max-width: 768px) 128px, 160px"
              fallbackClassName="text-2xl"
            />
          </Link>

          {/* Desktop auth links */}
          <div className="hidden items-center space-x-3 md:flex">
            {desktopAuthLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-6 py-2 font-medium transition-all duration-200 ${
                  link.href === '/auth/register'
                    ? 'border border-border hover:bg-muted/50'
                    : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile hamburger */}
          <MobileMenuToggle links={mobileLinks} />
        </div>
      </div>
    </nav>
  );
}
