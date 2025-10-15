import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Trash2, MoreVertical, Settings } from 'lucide-react';
import type { Account } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface AccountActionsDropdownProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onAlertSettings: (account: Account) => void;
}

export function AccountActionsDropdown({ 
  account, 
  onEdit, 
  onDelete, 
  onAlertSettings 
}: AccountActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 220, maxHeight: 240 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<'down' | 'up' | 'sheet'>('down');

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownElement = dropdownRef.current;
    const dropdownHeight = dropdownElement?.offsetHeight ?? 210;
    const safeMargin = 12;
    const gap = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const baseWidth = viewportWidth < 640 ? Math.min(viewportWidth - safeMargin * 2, 300) : 256;

    const minLeft = scrollX + safeMargin;
    const maxLeft = scrollX + viewportWidth - baseWidth - safeMargin;
    let left = rect.right - baseWidth + scrollX;
    left = clamp(left, minLeft, Math.max(minLeft, maxLeft));

    let top = rect.bottom + gap + scrollY;
    let nextPlacement: 'down' | 'up' | 'sheet' = 'down';

    const availableBelow = viewportHeight - rect.bottom - safeMargin;
    const availableAbove = rect.top - safeMargin;

    if (availableBelow >= dropdownHeight + gap) {
      nextPlacement = 'down';
      top = rect.bottom + gap + scrollY;
    } else if (availableAbove >= dropdownHeight + gap) {
      nextPlacement = 'up';
      top = rect.top - dropdownHeight - gap + scrollY;
    } else {
      nextPlacement = 'sheet';
      const sheetWidth = viewportWidth < 640 ? Math.min(viewportWidth - safeMargin * 2, 360) : baseWidth;
      const sheetLeft = scrollX + (viewportWidth - sheetWidth) / 2;
      const sheetTop = scrollY + Math.max(safeMargin, viewportHeight - dropdownHeight - safeMargin);

      left = clamp(sheetLeft, minLeft, scrollX + viewportWidth - sheetWidth - safeMargin);

      setPosition({
        top: sheetTop,
        left,
        width: sheetWidth,
        maxHeight: viewportHeight - safeMargin * 2,
      });
      setPlacement(nextPlacement);
      return;
    }

    const maxTop = scrollY + viewportHeight - dropdownHeight - safeMargin;
    const minTop = scrollY + safeMargin;

    if (nextPlacement === 'down' && top > maxTop) {
      nextPlacement = 'up';
      top = rect.top - dropdownHeight - gap + scrollY;
    }

    if (nextPlacement === 'up' && top < minTop) {
      top = minTop;
    }

    setPosition({ top, left, width: baseWidth, maxHeight: viewportHeight - safeMargin * 2 });
    setPlacement(nextPlacement);
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleEdit = () => {
    onEdit(account);
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (confirm(`¿Estás seguro de que quieres eliminar la cuenta "${account.name}"?`)) {
      onDelete(account);
    }
    setIsOpen(false);
  };

  const handleAlertSettings = () => {
    onAlertSettings(account);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => {
        calculatePosition();
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen, calculatePosition]);

  // Close on click outside
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
          const dropdown = document.getElementById(`account-dropdown-${account.id}`);
          if (dropdown && !dropdown.contains(event.target as Node)) {
            setIsOpen(false);
          }
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, account.id]);

  // Close on scroll/resize
  useEffect(() => {
    if (isOpen) {
      const handleScrollOrResize = () => {
        calculatePosition();
      };

      window.addEventListener('scroll', handleScrollOrResize, { passive: true });
      window.addEventListener('resize', handleScrollOrResize);
      
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    return () => {
      setPlacement('down');
    };
  }, [isOpen]);
  if (typeof document === 'undefined') return null;

  return (
    <>
      <button 
        ref={triggerRef}
        onClick={handleToggle}
        className="p-1.5 md:p-2 text-muted-foreground hover:text-foreground hover:bg-muted/20 rounded-xl transition-all duration-200 flex-shrink-0"
        aria-label={`Acciones para ${account.name}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      
      <AnimatePresence>
        {isOpen && createPortal(
          <motion.div
            ref={dropdownRef}
            id={`account-dropdown-${account.id}`}
            className={`fixed flex flex-col z-[10000] overflow-hidden border border-border/60 backdrop-blur-xl shadow-2xl shadow-black/40 ring-1 ring-black/10 bg-[rgba(15,15,18,0.94)] ${
              placement === 'sheet' ? 'rounded-t-3xl rounded-b-2xl' : 'rounded-2xl'
            }`}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              maxHeight: `${position.maxHeight}px`,
              transformOrigin:
                placement === 'down'
                  ? 'top right'
                  : placement === 'up'
                    ? 'bottom right'
                    : 'center',
              overflowY: placement === 'sheet' ? 'auto' : 'visible',
            }}
            role="menu"
            aria-orientation="vertical"
            initial={
              placement === 'sheet'
                ? { opacity: 0, y: 28 }
                : { opacity: 0, scale: 0.96, y: placement === 'down' ? -10 : 10 }
            }
            animate={
              placement === 'sheet' ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              placement === 'sheet'
                ? { opacity: 0, y: 24 }
                : { opacity: 0, scale: 0.96, y: placement === 'down' ? -10 : 10 }
            }
            transition={{ duration: 0.18, ease: 'easeInOut' }}
          >
            <motion.button
              onClick={handleEdit}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm sm:text-[15px] text-foreground hover:bg-muted/40/70 transition-colors"
              role="menuitem"
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/40 text-foreground">
                <Edit className="h-[18px] w-[18px]" />
              </span>
              <span className="font-medium">Editar cuenta</span>
            </motion.button>

            <motion.button
              onClick={handleAlertSettings}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm sm:text-[15px] text-foreground hover:bg-muted/40/70 transition-colors"
              role="menuitem"
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/40 text-foreground">
                <Settings className="h-[18px] w-[18px]" />
              </span>
              <span className="font-medium">Alertas de saldo</span>
            </motion.button>

            <motion.button
              onClick={handleDelete}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm sm:text-[15px] text-error-400 hover:bg-error/25 transition-colors"
              role="menuitem"
              whileHover={{ backgroundColor: 'rgba(239,68,68,0.18)' }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-error-500/20 text-error-200">
                <Trash2 className="h-[18px] w-[18px]" />
              </span>
              <span className="font-medium">Eliminar cuenta</span>
            </motion.button>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}