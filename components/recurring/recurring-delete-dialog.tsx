'use client';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { RecurringTransaction } from '@/types/recurring-transactions';
import { AlertTriangle } from 'lucide-react';

interface RecurringDeleteDialogProps {
  open: boolean;
  transaction: RecurringTransaction | null;
  isDeleting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (id: string) => void;
}

export function RecurringDeleteDialog({
  open,
  transaction,
  isDeleting = false,
  onOpenChange,
  onConfirmDelete,
}: RecurringDeleteDialogProps) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isDeleting) {
          onOpenChange(false);
        }
      }}
      title="Eliminar transaccion recurrente"
      description="Esta accion no se puede deshacer"
      size="md"
      className="max-h-[92dvh] pb-safe-bottom"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Vas a eliminar esta transaccion recurrente.
            </p>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {transaction?.name || 'Sin nombre'}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px]"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            className="min-h-[44px]"
            onClick={() => transaction && onConfirmDelete(transaction.id)}
            disabled={!transaction || isDeleting}
            loading={isDeleting}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
