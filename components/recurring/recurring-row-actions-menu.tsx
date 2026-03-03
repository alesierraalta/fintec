'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, MoreVertical, Trash2 } from 'lucide-react';

interface RecurringRowActionsMenuProps {
  transactionId: string;
  transactionName: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function RecurringRowActionsMenu({
  transactionId,
  transactionName,
  onEdit,
  onDelete,
  disabled = false,
  loading = false,
}: RecurringRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const menuId = `recurring-actions-${transactionId}`;

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-[44px] min-w-[44px] px-2"
        aria-label={`Acciones para ${transactionName}`}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-expanded={open}
        disabled={disabled || loading}
        onClick={() => setOpen((prev) => !prev)}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <MoreVertical className="h-4 w-4" />
        )}
      </Button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Menu de acciones para ${transactionName}`}
          className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-border bg-card p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            disabled={disabled || loading}
          >
            <Edit className="h-4 w-4" />
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            disabled={disabled || loading}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
