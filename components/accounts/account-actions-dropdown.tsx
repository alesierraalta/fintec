import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Trash2, MoreVertical, Settings } from 'lucide-react';
import type { Account } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const calculatePosition = () => {
    if (triggerRef.current && typeof window !== 'undefined') {
      const rect = triggerRef.current.getBoundingClientRect();
      // Adjust for mobile: position to the left on small screens
      const width = window.innerWidth < 640 ? 200 : 220; // Responsive width
      setPosition({
        top: rect.bottom + window.scrollY,
        left: Math.max(rect.right - width + window.scrollX, 0),
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
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
            id={`account-dropdown-${account.id}`}
            className="fixed bg-card border border-border/40 rounded-2xl shadow-xl backdrop-blur-sm z-[10000] overflow-hidden"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              minWidth: '180px',
              maxWidth: '220px',
            }}
            role="menu"
            aria-orientation="vertical"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
          >
            <motion.button
              onClick={handleEdit}
              className="flex items-center w-full px-3 md:px-4 py-2.5 md:py-3 text-left text-sm text-foreground hover:bg-muted/40 transition-colors"
              role="menuitem"
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
            >
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-3 flex-shrink-0" />
              <span>Editar cuenta</span>
            </motion.button>
            
            <motion.button
              onClick={handleAlertSettings}
              className="flex items-center w-full px-3 md:px-4 py-2.5 md:py-3 text-left text-sm text-foreground hover:bg-muted/40 transition-colors"
              role="menuitem"
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
            >
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-3 flex-shrink-0" />
              <span>Alertas de saldo</span>
            </motion.button>
            
            <motion.button
              onClick={handleDelete}
              className="flex items-center w-full px-3 md:px-4 py-2.5 md:py-3 text-left text-sm text-error-600 hover:bg-error/10 transition-colors"
              role="menuitem"
              whileHover={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-3 flex-shrink-0" />
              <span>Eliminar cuenta</span>
            </motion.button>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}