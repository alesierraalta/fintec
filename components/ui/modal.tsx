import * as React from 'react';
import { cn } from '@/lib/utils';
import { useNativeBackNavigation } from '@/components/providers/native-back-navigation';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ModalSize } from '@/types';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
  className?: string;
  closeButtonClassName?: string;
  mobileFullScreen?: boolean;
  footer?: React.ReactNode;
  contentClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className,
  closeButtonClassName,
  mobileFullScreen = false,
  footer,
  contentClassName,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);
  const lastActiveElementRef = React.useRef<HTMLElement | null>(null);
  const registerBack = useNativeBackNavigation();
  const backId = React.useId();
  const shouldReduceMotion =
    typeof useReducedMotion === 'function' ? useReducedMotion() : false;
  const isMobile = useMediaQuery('(max-width: 639px)');

  React.useEffect(() => {
    if (!open) return;
    return registerBack({
      id: `modal-${backId}`,
      priority: 100,
      close: onClose,
    });
  }, [open, onClose, registerBack, backId]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const active = document.activeElement;
    lastActiveElementRef.current =
      active instanceof HTMLElement ? active : null;

    requestAnimationFrame(() => {
      modalRef.current?.focus();
    });

    return () => {
      lastActiveElementRef.current?.focus?.();
      lastActiveElementRef.current = null;
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-6xl',
  };

  const isSlideUp = mobileFullScreen && isMobile;

  const modalVariants = {
    initial: shouldReduceMotion
      ? { opacity: 0 }
      : isSlideUp
        ? { y: '100%', opacity: 0.9 }
        : { opacity: 0, scale: 0.96, y: 10 },
    animate: shouldReduceMotion
      ? { opacity: 1 }
      : isSlideUp
        ? { y: 0, opacity: 1 }
        : { opacity: 1, scale: 1, y: 0 },
    exit: shouldReduceMotion
      ? { opacity: 0 }
      : isSlideUp
        ? { y: '100%', opacity: 0.9 }
        : { opacity: 0, scale: 0.96, y: 10 },
  };

  const modalTransition = shouldReduceMotion
    ? { duration: 0.1 }
    : isSlideUp
      ? { type: 'spring' as const, damping: 28, stiffness: 320, mass: 0.85 }
      : { type: 'spring' as const, damping: 25, stiffness: 300 };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={modalTransition}
            ref={modalRef}
            className={cn(
              mobileFullScreen
                ? 'fixed inset-0 m-0 flex h-[100dvh] h-screen max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 bg-card/95 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] shadow-2xl backdrop-blur-xl sm:relative sm:mx-4 sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl sm:border sm:border-border/50 sm:pl-0 sm:pr-0'
                : 'relative mx-4 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl',
              sizeClasses[size],
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            {/* Header - solo si hay título */}
            {(title || description) && (
              <div
                className={cn(
                  'flex-shrink-0 border-b border-border/50 px-4 pb-3.5 sm:px-6 sm:py-4',
                  mobileFullScreen
                    ? 'pt-[calc(env(safe-area-inset-top,0px)+0.875rem)] sm:pt-4'
                    : 'py-3.5'
                )}
              >
                {title && (
                  <h2
                    id="modal-title"
                    className="pr-12 text-base font-semibold text-foreground sm:pr-10 sm:text-lg"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id="modal-description"
                    className="mt-1 pr-12 text-xs text-muted-foreground sm:pr-10 sm:text-sm"
                  >
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Close button - solo si hay título */}
            {title && (
              <button
                type="button"
                className={cn(
                  'focus-ring absolute flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95',
                  mobileFullScreen
                    ? 'right-[calc(env(safe-area-inset-right,0px)+0.625rem)] top-[calc(env(safe-area-inset-top,0px)+0.625rem)] sm:right-4 sm:top-4'
                    : 'right-2.5 top-2.5 sm:right-4 sm:top-4',
                  closeButtonClassName
                )}
                onClick={onClose}
                aria-label="Cerrar modal"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}

            {/* Content - scrollable area */}
            <div
              data-testid="modal-scroll-content"
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-contain',
                !title && !description && mobileFullScreen
                  ? 'pt-[calc(env(safe-area-inset-top,0px)+1rem)]'
                  : '',
                footer
                  ? ''
                  : mobileFullScreen
                    ? 'pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]'
                    : 'pb-safe-bottom',
                title || description ? 'px-4 py-4 sm:px-6' : '',
                contentClassName
              )}
            >
              {children}
            </div>

            {/* Sticky footer outside scrollable body */}
            {footer && (
              <div
                data-testid="modal-footer"
                className={cn(
                  'flex-shrink-0 border-t border-border/50 bg-card/95 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4',
                  mobileFullScreen
                    ? 'pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:pb-4'
                    : 'pb-safe-bottom'
                )}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div className={cn('border-b border-border/50 px-6 py-4', className)}>
      {children}
    </div>
  );
}

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalContent({ children, className }: ModalContentProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex justify-end space-x-3 border-t border-border/50 px-6 py-4',
        className
      )}
    >
      {children}
    </div>
  );
}
