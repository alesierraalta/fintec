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



