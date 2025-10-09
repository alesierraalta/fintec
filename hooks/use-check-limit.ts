import { useSubscription } from './use-subscription';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { UsageStatus } from '@/types/subscription';

/**
 * Hook para verificar límites antes de ejecutar acciones.
 * 
 * Uso:
 * ```tsx
 * const { checkLimit, canPerformAction } = useCheckLimit();
 * 
 * const handleCreateTransaction = async () => {
 *   if (!canPerformAction('transactions')) {
 *     // Mostrar mensaje o redirigir
 *     return;
 *   }
 *   // Proceder con la acción
 * };
 * ```
 */
export function useCheckLimit() {
  const { isFree, isAtLimit, usageStatus, canUpgrade } = useSubscription();
  const router = useRouter();

  /**
   * Verifica si el usuario puede realizar una acción basado en su límite.
   * Retorna true si puede, false si no puede (límite alcanzado).
   */
  const canPerformAction = useCallback((resource: keyof UsageStatus): boolean => {
    // Usuarios pagos siempre pueden
    if (!isFree) {
      return true;
    }

    // Si no hay info de uso, permitir por defecto
    if (!usageStatus) {
      return true;
    }

    // Verificar si está en el límite
    return !isAtLimit(resource);
  }, [isFree, usageStatus, isAtLimit]);

  /**
   * Verifica el límite y retorna un objeto con el resultado y mensaje.
   * Útil para mostrar mensajes personalizados.
   */
  const checkLimit = useCallback((resource: keyof UsageStatus) => {
    const can = canPerformAction(resource);
    
    if (!can && usageStatus) {
      const status = usageStatus[resource];
      const resourceNames: Record<keyof UsageStatus, string> = {
        transactions: 'transacciones',
        backups: 'backups',
        exports: 'exportaciones',
        aiRequests: 'consultas de IA',
      };

      return {
        allowed: false,
        message: `Has alcanzado el límite de ${resourceNames[resource]} (${status.current}/${typeof status.limit === 'number' ? status.limit : 'ilimitado'}) de tu plan gratuito.`,
        canUpgrade,
      };
    }

    return {
      allowed: true,
      message: null,
      canUpgrade,
    };
  }, [canPerformAction, usageStatus, canUpgrade]);

  /**
   * Redirige al usuario a la página de pricing.
   */
  const redirectToUpgrade = useCallback(() => {
    router.push('/pricing');
  }, [router]);

  return {
    canPerformAction,
    checkLimit,
    redirectToUpgrade,
    isFree,
  };
}
