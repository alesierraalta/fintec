'use client';

import { Button } from '@/components/ui/button';
import { useAIChat, PendingAction } from '@/contexts/ai-chat-context';
import { Check, X } from 'lucide-react';

/**
 * Componente que muestra botones de confirmación cuando hay una acción pendiente
 * Permite al usuario confirmar o rechazar una acción antes de ejecutarla
 */
export function ActionConfirmationButtons() {
  const { pendingAction, confirmAction, rejectAction, isLoading } = useAIChat();

  if (!pendingAction) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/50">
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          Confirmación requerida
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {pendingAction.confirmationMessage || '¿Confirmas esta acción?'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={confirmAction}
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          icon={<Check className="h-4 w-4" />}
        >
          Confirmar
        </Button>
        <Button
          onClick={rejectAction}
          disabled={isLoading}
          variant="secondary"
          className="flex-1"
          icon={<X className="h-4 w-4" />}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}