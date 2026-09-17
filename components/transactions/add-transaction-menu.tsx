'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  Plus,
  Receipt,
  ChevronDown,
  Sparkles,
  X,
  FileText,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface AddTransactionMenuProps {
  /** Label for the trigger button (default: "Agregar") */
  label?: string;
  /** Variant for the trigger button */
  variant?: 'primary' | 'outline' | 'secondary' | 'ghost';
  /** Extra CSS classes for the trigger button */
  className?: string;
  /** Callback when user selects single transaction */
  onAddSingle?: () => void;
  /** Callback when user selects batch upload */
  onAddBatch?: () => void;
  /** Optional custom trigger renderer */
  customTrigger?: (props: {
    isOpen: boolean;
    onClick: () => void;
    ref: React.RefObject<HTMLButtonElement>;
  }) => React.ReactNode;
  /** Controlled open state */
  isOpen?: boolean;
  /** Controlled onOpenChange */
  onOpenChange?: (open: boolean) => void;
}

export function AddTransactionMenu({
  label = 'Agregar',
  variant = 'primary',
  className,
  onAddSingle,
  onAddBatch,
  customTrigger,
  isOpen: controlledIsOpen,
  onOpenChange,
}: AddTransactionMenuProps) {
  const router = useRouter();
  const menuId = useId();
  const shouldReduceMotion =
    typeof useReducedMotion === 'function' ? useReducedMotion() : false;
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const setIsOpen = useCallback(
    (nextOpen: boolean) => {
      if (controlledIsOpen === undefined) {
        setInternalIsOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [controlledIsOpen, onOpenChange]
  );

  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check viewport on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(e.target as Node))
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  const handleSelectSingle = useCallback(() => {
    setIsOpen(false);
    if (onAddSingle) {
      onAddSingle();
    } else {
      router.push('/transactions/add');
    }
  }, [onAddSingle, router, setIsOpen]);

  const handleSelectBatch = useCallback(() => {
    setIsOpen(false);
    if (onAddBatch) {
      onAddBatch();
    } else {
      router.push('/transactions?action=batch');
    }
  }, [onAddBatch, router, setIsOpen]);

  const overlayHost =
    typeof document !== 'undefined'
      ? (document.getElementById('modal-root') ?? document.body)
      : null;

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {customTrigger ? (
        customTrigger({
          isOpen,
          onClick: () => setIsOpen(!isOpen),
          ref: triggerRef,
        })
      ) : (
        <Button
          ref={triggerRef}
          type="button"
          variant={variant}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          className={cn(
            'ios-button-primary flex items-center gap-2 font-medium shadow-md transition-all active:scale-95',
            className
          )}
        >
          <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{label}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </Button>
      )}

      {/* Desktop Popover Menu with Exit Animation */}
      <AnimatePresence>
        {isOpen && !isMobile && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-orientation="vertical"
            aria-label="Opciones para agregar"
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: -6 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: -6 }
            }
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl border border-border/50 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl focus:outline-none"
          >
            <div className="border-b border-border/40 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Selecciona una opción
              </p>
            </div>

            <div className="space-y-1 py-1">
              <button
                type="button"
                role="menuitem"
                onClick={handleSelectSingle}
                className="group flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-primary/10 focus:bg-primary/10 focus:outline-none active:scale-[0.98]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    Agregar transacción
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Individual (gasto, ingreso o transferencia)
                  </span>
                </div>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={handleSelectBatch}
                className="group flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-indigo-500/10 focus:bg-indigo-500/10 focus:outline-none active:scale-[0.98]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white dark:text-indigo-400">
                  <Receipt className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      Agregar en lote
                    </span>
                    <span className="py-0.2 inline-flex items-center gap-0.5 rounded-full bg-indigo-500/15 px-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="h-2.5 w-2.5" />
                      IA
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Varios comprobantes o fotos a la vez
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Action Sheet with AnimatePresence & Drag-to-Dismiss */}
      {overlayHost &&
        createPortal(
          <AnimatePresence>
            {isOpen && isMobile && (
              <div
                className="fixed inset-0 z-[65] flex flex-col justify-end"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${menuId}-sheet-title`}
              >
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsOpen(false)}
                  aria-hidden="true"
                />

                {/* Bottom Sheet Drawer */}
                <motion.div
                  ref={menuRef}
                  id={menuId}
                  role="menu"
                  initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%' }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%' }}
                  transition={{
                    type: 'spring',
                    damping: 28,
                    stiffness: 320,
                    mass: 0.8,
                  }}
                  drag={shouldReduceMotion ? false : 'y'}
                  dragConstraints={{ top: 0 }}
                  dragElastic={{ top: 0, bottom: 0.5 }}
                  onDragEnd={(_e, info) => {
                    if (info.offset.y > 100 || info.velocity.y > 500) {
                      setIsOpen(false);
                    }
                  }}
                  className="relative z-10 w-full touch-pan-y rounded-t-3xl border-t border-border/40 bg-card/95 p-5 shadow-2xl backdrop-blur-2xl"
                  style={{
                    paddingBottom:
                      'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))',
                  }}
                >
                  {/* Subtle tactile drag handle */}
                  <div
                    className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30"
                    aria-hidden="true"
                  />

                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3
                        id={`${menuId}-sheet-title`}
                        className="text-lg font-bold text-foreground"
                      >
                        Agregar transacción
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Elige cómo deseas registrar tus operaciones
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"
                      aria-label="Cerrar opciones"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Action Cards */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSelectSingle}
                      className="flex w-full items-center gap-3.5 rounded-2xl border border-border/50 bg-background/80 p-3.5 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.04] active:scale-[0.98]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">
                            Agregar transacción
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Individual
                          </span>
                        </div>
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          Crea un gasto, ingreso o transferencia con el
                          formulario completo.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSelectBatch}
                      className="flex w-full items-center gap-3.5 rounded-2xl border border-border/50 bg-background/80 p-3.5 text-left transition-all hover:border-indigo-500/40 hover:bg-indigo-500/[0.04] active:scale-[0.98]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Receipt className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">
                              Agregar en lote
                            </span>
                            <span className="py-0.2 inline-flex items-center gap-0.5 rounded-full bg-indigo-500/15 px-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                              <Sparkles className="h-2.5 w-2.5" />
                              IA
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                            Múltiples fotos
                          </span>
                        </div>
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          Sube fotos o capturas de pantalla de pagos y extrae
                          los datos automáticamente.
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Cancel Button */}
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsOpen(false)}
                      className="h-11 w-full rounded-xl text-sm font-medium text-muted-foreground"
                    >
                      Cancelar
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          overlayHost
        )}
    </div>
  );
}
