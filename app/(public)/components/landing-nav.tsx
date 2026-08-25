import Link from 'next/link';
import { Download } from 'lucide-react';
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
  const downloadLink = links.find((l) => l.href === '/download');

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

          {/* Desktop links */}
          <div className="hidden items-center space-x-3 md:flex">
            {downloadLink && (
              <Link
                href={downloadLink.href}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-2 font-medium text-primary transition-all duration-200 hover:bg-primary/20"
              >
                <Download className="h-4 w-4" />
                {downloadLink.label}
              </Link>
            )}
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

          {/* Mobile actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/download"
              aria-label="Descargar APK Android Beta"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95 md:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M16 6l1.2-1.2-1.4-1.4L15 2l-1.8 1.8A6.9 6.9 0 0012 3.5a6.9 6.9 0 00-1.2.1L9 2 8.2 3.4 9.4 4.6 10.6 6H6.8a1.8 1.8 0 00-1.8 1.8v5.5a1.8 1.8 0 001.8 1.8H7V19a1 1 0 001 1h1v2.5a1.25 1.25 0 102.5 0V20h1v2.5a1.25 1.25 0 102.5 0V20h1a1 1 0 001-1v-3.9h.2a1.8 1.8 0 001.8-1.8V7.8A1.8 1.8 0 0016 6h0zM12 4.5a5 5 0 015 5H7a5 5 0 015-5zM5.5 10a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm13 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
              </svg>
            </Link>
            <MobileMenuToggle links={mobileLinks} />
          </div>
        </div>
      </div>
    </nav>
  );
}
