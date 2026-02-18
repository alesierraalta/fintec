'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useSyncExternalStore,
} from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  /** Key para persistir estado en localStorage */
  storageKey?: string;
  /** Forzar colapsado en mobile */
  collapseOnMobile?: boolean;
  /** Badge o indicador junto al título */
  badge?: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultExpanded = true,
  storageKey,
  collapseOnMobile = true,
  badge,
  className = '',
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultExpanded;
    }

    if (storageKey) {
      const saved = localStorage.getItem(`collapsible-${storageKey}`);
      if (saved !== null) {
        return saved === 'true';
      }
    }

    if (collapseOnMobile && window.innerWidth < 768) {
      return false;
    }

    return defaultExpanded;
  });
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile || !collapseOnMobile) {
        return;
      }

      if (
        storageKey &&
        localStorage.getItem(`collapsible-${storageKey}`) !== null
      ) {
        return;
      }

      setIsExpanded(false);
    };

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [collapseOnMobile, storageKey]);

  // Save state to localStorage
  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => {
      const newState = !prev;

      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(`collapsible-${storageKey}`, String(newState));
      }

      return newState;
    });
  }, [storageKey]);

  // Prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div
        className={`black-theme-card overflow-hidden rounded-3xl ${className}`}
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon && <div className="text-primary">{icon}</div>}
              <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                {title}
              </h3>
              {badge}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`black-theme-card overflow-hidden rounded-3xl ${className}`}
    >
      {/* Header - always visible */}
      <motion.button
        className="flex w-full cursor-pointer items-center justify-between p-4 transition-colors duration-200 hover:bg-card/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-6"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls={`collapsible-content-${storageKey || title}`}
      >
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              {icon}
            </div>
          )}
          <div className="text-left">
            <h3 className="text-lg font-semibold text-foreground sm:text-xl">
              {title}
            </h3>
          </div>
          {badge && <div className="ml-2">{badge}</div>}
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-full bg-muted/20 p-2 text-muted-foreground"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`collapsible-content-${storageKey || title}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.25, delay: 0.1 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed hint for mobile */}
      <AnimatePresence>
        {!isExpanded && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-3 text-center"
          >
            <span className="text-xs text-muted-foreground/60">
              Toca para expandir
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
