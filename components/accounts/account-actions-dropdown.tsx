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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 220 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownElement = dropdownRef.current;
    const dropdownHeight = dropdownElement?.offsetHeight ?? 192;
    const safeMargin = 8;
    const gap = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const width = viewportWidth < 640 ? 240 : 248;

    const minLeft = scrollX + safeMargin;
    const maxLeft = scrollX + viewportWidth - width - safeMargin;
    let left = rect.right - width + scrollX;
    left = clamp(left, minLeft, Math.max(minLeft, maxLeft));

    let top = rect.bottom + gap + scrollY;
    let direction: 'down' | 'up' = 'down';

    const availableBelow = viewportHeight - rect.bottom;
    const availableAbove = rect.top;

    if (availableBelow < dropdownHeight + gap && availableAbove >= dropdownHeight) {
      direction = 'up';
      top = rect.top - dropdownHeight - gap + scrollY;
    }

    const maxTop = scrollY + viewportHeight - dropdownHeight - safeMargin;
    const minTop = scrollY + safeMargin;

    if (direction === 'down' && top > maxTop) {
      direction = 'up';
      top = rect.top - dropdownHeight - gap + scrollY;
    }

    if (direction === 'up' && top < minTop) {
      top = minTop;
    }

    setPosition({ top, left, width });
    setDropdownDirection(direction);
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

      window.addEventListener('scroll', handleScrollOrResize);
      window.addEventListener('resize', handleScrollOrResize);
      
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, calculatePosition]);

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
            className="fixed flex flex-col bg-card/95 border border-border/60 rounded-2xl shadow-2xl backdrop-blur-md ring-1 ring-black/5 z-[10000] overflow-hidden"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              transformOrigin: dropdownDirection === 'down' ? 'top right' : 'bottom right',
            }}
            role="menu"
            aria-orientation="vertical"
            initial={{ opacity: 0, scale: 0.97, y: dropdownDirection === 'down' ? -6 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: dropdownDirection === 'down' ? -6 : 6 }}
            transition={{ duration: 0.16, ease: 'easeInOut' }}
          >
            <motion.button
              onClick={handleEdit}
              className="flex items-center w-full px-4 py-3 text-left text-sm sm:text-[15px] text-foreground hover:bg-muted/40 transition-colors"
              role="menuitem"
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
            >
              <Edit className="h-4 w-4 mr-3 flex-shrink-0" />
              <span>Editar cuenta</span>
            </motion.button>
            
            <motion.button
              onClick={handleAlertSettings}
              className="flex items-center w-full px-4 py-3 text-left text-sm sm:text-[15px] text-foreground hover:bg-muted/40 transition-colors"
              role="menuitem"
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
            >
              <Settings className="h-4 w-4 mr-3 flex-shrink-0" />
              <span>Alertas de saldo</span>
            </motion.button>
            
            <motion.button
              onClick={handleDelete}
              className="flex items-center w-full px-4 py-3 text-left text-sm sm:text-[15px] text-error-600 hover:bg-error/10 transition-colors"
              role="menuitem"
              whileHover={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
            >
              <Trash2 className="h-4 w-4 mr-3 flex-shrink-0" />
              <span>Eliminar cuenta</span>
            </motion.button>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}