/**
 * account-projections.ts
 * Proyecciones de campos para optimizar las consultas de cuentas en Supabase.
 * Reduce el payload al evitar select('*') y traer solo lo necesario.
 */

// Proyección para listados (excluye campos pesados si los hubiera)
export const ACCOUNT_LIST_PROJECTION = `
  id,
  user_id,
  name,
  type,
  currency_code,
  balance,
  active,
  minimum_balance,
  alert_enabled,
  created_at,
  updated_at
`.replace(/\s+/g, '');

// Proyección para detalles (en caso de que necesitemos relaciones en el futuro)
export const ACCOUNT_DETAIL_PROJECTION = ACCOUNT_LIST_PROJECTION;
