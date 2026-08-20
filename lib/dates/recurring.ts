import { RecurringFrequency } from '@/types/recurring-transactions';

/**
 * Calculate the next execution date for a recurring transaction
 */
export function calculate_next_execution_date(
  currentDate: string,
  frequency: RecurringFrequency,
  intervalCount: number = 1
): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + intervalCount);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (7 * intervalCount));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + intervalCount);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + intervalCount);
      break;
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }
  
  return date.toISOString().split('T')[0];
}

/**
 * Resolve the rule's next execution date BEFORE rule creation so the rule and
 * its schedule are persisted atomically.
 *
 * - When the first operation is NOT registered now, the next scheduled
 *   operation is the start date itself (the first due occurrence).
 * - When the first operation IS registered now, the next scheduled operation
 *   is the next frequency occurrence AFTER the immediate operation, so cron
 *   never duplicates it.
 *
 * Computes on the date-only (YYYY-MM-DD) value using UTC arithmetic so the
 * result is deterministic regardless of the server's local timezone.
 */
export function resolveRecurringNextExecutionDate(
  startDate: string,
  frequency: RecurringFrequency,
  intervalCount: number = 1,
  registerFirstOperation: boolean
): string {
  if (!registerFirstOperation) {
    return startDate;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new Error(`Invalid date: ${startDate}`);
  }

  const [yearText, monthText, dayText] = startDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText); // 1-based
  const day = Number(dayText);

  const base = new Date(Date.UTC(year, month - 1, day));
  const result = new Date(base);

  switch (frequency) {
    case 'daily':
      result.setUTCDate(base.getUTCDate() + intervalCount);
      break;
    case 'weekly':
      result.setUTCDate(base.getUTCDate() + 7 * intervalCount);
      break;
    case 'monthly':
      result.setUTCMonth(base.getUTCMonth() + intervalCount);
      break;
    case 'yearly':
      result.setUTCFullYear(base.getUTCFullYear() + intervalCount);
      break;
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }

  const y = result.getUTCFullYear();
  const m = String(result.getUTCMonth() + 1).padStart(2, '0');
  const d = String(result.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get human readable description of frequency
 */
export function getFrequencyDescription(
  frequency: RecurringFrequency,
  intervalCount: number = 1
): string {
  const count = intervalCount > 1 ? ` cada ${intervalCount}` : '';
  
  switch (frequency) {
    case 'daily':
      return `Diariamente${count}`;
    case 'weekly':
      return `Semanalmente${count}`;
    case 'monthly':
      return `Mensualmente${count}`;
    case 'yearly':
      return `Anualmente${count}`;
    default:
      return 'Desconocido';
  }
}



