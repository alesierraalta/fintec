'use client';

import { useSubscription } from '@/hooks/use-subscription';
import { Alert } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { UsageStatus } from '@/types/subscription';

interface FreeLimitWarningProps {
  /**
   * Recursos específicos a verificar. Si no se especifica, verifica todos.
   */
  resources?: Array<keyof UsageStatus>;
  /**
   * Si true, muestra el warning solo si está en 100% o más
   * Si false, muestra el warning desde 80%
   */
  onlyAtLimit?: boolean;
}

/**
 * Componente que muestra avisos cuando usuarios free se acercan o exceden límites.
 * 
 * Umbrales:
 * - 80-99%: Warning (advertencia)
 * - 100%+: Error (límite excedido)
 */
export function FreeLimitWarning({ resources, onlyAtLimit = false }: FreeLimitWarningProps) {
  const { isFree, usageStatus, isApproachingLimit, isAtLimit, canUpgrade } = useSubscription();
  const router = useRouter();

  // Solo mostramos avisos para usuarios free
  if (!isFree || !usageStatus) {
    return null;
  }

  const resourcesToCheck: Array<keyof UsageStatus> = resources || [
    'transactions',
    'backups',
    'exports',
    'aiRequests',
  ];

  // Encontrar recursos que están en el límite o cerca de él
  const limitReached = resourcesToCheck.filter(resource => isAtLimit(resource));
  const approaching = onlyAtLimit ? [] : resourcesToCheck.filter(
    resource => isApproachingLimit(resource) && !isAtLimit(resource)
  );

  // Si no hay ningún warning, no mostrar nada
  if (limitReached.length === 0 && approaching.length === 0) {
    return null;
  }

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  // Mapeo de nombres amigables
  const resourceNames: Record<keyof UsageStatus, string> = {
    transactions: 'transacciones',
    backups: 'backups',
    exports: 'exportaciones',
    aiRequests: 'consultas de IA',
  };

  // Mostrar error si hay límites alcanzados
  if (limitReached.length > 0) {
    const resource = limitReached[0];
    const status = usageStatus[resource];
    
    return (
      <Alert 
        type="error" 
        title="Límite alcanzado"
      >
        <p className="mb-2">
          Has alcanzado el límite de {resourceNames[resource]} de tu plan gratuito (
          {status.current}/{typeof status.limit === 'number' ? status.limit : 'ilimitado'}).
        </p>
        {canUpgrade && (
          <button
            onClick={handleUpgrade}
            className="text-sm font-medium underline hover:no-underline"
          >
            Actualiza tu plan para continuar →
          </button>
        )}
      </Alert>
    );
  }

  // Mostrar warning si está cerca del límite
  if (approaching.length > 0) {
    const resource = approaching[0];
    const status = usageStatus[resource];
    
    return (
      <Alert 
        type="warning" 
        title="Acercándote al límite"
      >
        <p className="mb-2">
          Has usado {status.current} de {typeof status.limit === 'number' ? status.limit : 'ilimitado'} {resourceNames[resource]} 
          ({status.percentage}% de tu plan gratuito).
        </p>
        {canUpgrade && (
          <button
            onClick={handleUpgrade}
            className="text-sm font-medium underline hover:no-underline"
          >
            Actualiza tu plan antes de quedarte sin recursos →
          </button>
        )}
      </Alert>
    );
  }

  return null;
}
