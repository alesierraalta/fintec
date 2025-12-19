import * as React from 'react';
import { cn } from '@/lib/utils';
import { ModalSize } from '@/types';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);
  const lastActiveElementRef = React.useRef<HTMLElement | null>(null);

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
    lastActiveElementRef.current = active instanceof HTMLElement ? active : null;

    // Move focus into the dialog for keyboard users.
    requestAnimationFrame(() => {
      modalRef.current?.focus();
    });

    return () => {
      // Restore focus to the previously focused element (best effort).
      lastActiveElementRef.current?.focus?.();
      lastActiveElementRef.current = null;
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          // * Modal container with flex layout for proper content scrolling
          'relative w-full mx-4 bg-card/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 max-h-[90dvh] flex flex-col',
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
          <div className="px-4 sm:px-6 py-4 border-b border-white/20">
            {title && (
              <h2
                id="modal-title"
                className="text-lg font-semibold text-foreground"
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id="modal-description"
                className="mt-1 text-sm text-muted-foreground"
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
            className="absolute top-4 right-4 rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 focus-ring"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* Content - scrollable area with flex-1 to fill remaining space */}
        {/* * min-h-0 is essential for overflow to work in flex containers */}
        {title || description ? (
          <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        ) : (
          <div className="overflow-y-auto flex-1 min-h-0">{children}</div>
        )}
      </div>
    </div>
  );
}

export interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-white/20', className)}>
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
    <div className={cn('px-6 py-4 border-t border-white/20 flex justify-end space-x-3', className)}>
      {children}
    </div>
  );
}
