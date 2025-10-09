/**
 * Validación de límites de suscripción en el backend
 * 
 * Este módulo proporciona funciones para validar límites de uso
 * antes de permitir acciones en el backend.
 */

import { getUserTier, getUserUsage } from '@/lib/lemonsqueezy/subscriptions';
import { TIER_LIMITS } from '@/types/subscription';

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number | 'unlimited';
}

/**
 * Verifica si el usuario puede crear una transacción.
 * 
 * @param userId - ID del usuario
 * @returns Resultado indicando si la acción está permitida
 */
export async function canCreateTransaction(userId: string): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId);
  
  // Usuarios de pago no tienen límites
  if (tier !== 'free') {
    return { allowed: true };
  }

  const usage = await getUserUsage(userId);
  const limits = TIER_LIMITS[tier];
  
  const current = usage?.transactionCount || 0;
  const limit = limits.transactions;

  if (limit === 'unlimited') {
    return { allowed: true };
  }

  if (current >= limit) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${limit} transacciones de tu plan gratuito`,
      current,
      limit,
    };
  }

  return { allowed: true, current, limit };
}

/**
 * Verifica si el usuario puede crear un backup.
 * 
 * @param userId - ID del usuario
 * @returns Resultado indicando si la acción está permitida
 */
export async function canCreateBackup(userId: string): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId);
  
  if (tier !== 'free') {
    return { allowed: true };
  }

  const usage = await getUserUsage(userId);
  const limits = TIER_LIMITS[tier];
  
  const current = usage?.backupCount || 0;
  const limit = limits.backups;

  if (limit === 'unlimited') {
    return { allowed: true };
  }

  if (current >= limit) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${limit} backups de tu plan gratuito`,
      current,
      limit,
    };
  }

  return { allowed: true, current, limit };
}

/**
 * Verifica si el usuario puede realizar una exportación.
 * 
 * @param userId - ID del usuario
 * @returns Resultado indicando si la acción está permitida
 */
export async function canExport(userId: string): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId);
  
  if (tier !== 'free') {
    return { allowed: true };
  }

  const usage = await getUserUsage(userId);
  const limits = TIER_LIMITS[tier];
  
  const current = usage?.exportCount || 0;
  const limit = limits.exports;

  if (limit === 'unlimited') {
    return { allowed: true };
  }

  if (current >= limit) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${limit} exportaciones de tu plan gratuito`,
      current,
      limit,
    };
  }

  return { allowed: true, current, limit };
}

/**
 * Verifica si el usuario puede usar solicitudes de IA.
 * 
 * @param userId - ID del usuario
 * @returns Resultado indicando si la acción está permitida
 */
export async function canUseAI(userId: string): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId);
  
  if (tier === 'premium') {
    return { allowed: true };
  }

  const usage = await getUserUsage(userId);
  const limits = TIER_LIMITS[tier];
  
  const current = usage?.aiRequests || 0;
  const limit = limits.aiRequests;

  if (limit === 'unlimited') {
    return { allowed: true };
  }

  if (limit === 0) {
    return {
      allowed: false,
      reason: 'Las funciones de IA requieren un plan premium',
      current,
      limit,
    };
  }

  if (current >= limit) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${limit} solicitudes de IA de tu plan`,
      current,
      limit,
    };
  }

  return { allowed: true, current, limit };
}
