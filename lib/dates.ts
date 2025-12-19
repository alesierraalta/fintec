// Date utility functions for the finance application
// Migrated from date-fns to dayjs for better performance and smaller bundle size

import dayjs from './dates/dayjs';
import type { ConfigType, OpUnitType } from 'dayjs';

export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DISPLAY_SHORT: 'DD/MM/YYYY',
  DISPLAY_MEDIUM: 'DD MMM YYYY',
  DISPLAY_LONG: 'DD MMMM YYYY',
  MONTH_YEAR: 'YYYY-MM',
  MONTH_NAME: 'MMMM YYYY',
} as const;

// Format date for display
export function formatDate(
  date: string | Date,
  formatStr: keyof typeof DATE_FORMATS | string = 'DISPLAY_MEDIUM'
): string {
  const dateObj = dayjs(date);

  if (!dateObj.isValid()) {
    return 'Fecha inválida';
  }

  const formatPattern = DATE_FORMATS[formatStr as keyof typeof DATE_FORMATS] || formatStr;
  return dateObj.format(formatPattern);
}

// Parse date string
export function parseDate(dateStr: string, formatStr: string = DATE_FORMATS.ISO): Date | null {
  try {
    const parsed = dayjs(dateStr, formatStr);
    return parsed.isValid() ? parsed.toDate() : null;
  } catch {
    return null;
  }
}

// Get current date in ISO format
export function getCurrentDate(): string {
  return dayjs().format(DATE_FORMATS.ISO);
}

// Get current datetime in ISO format
export function getCurrentDateTime(): string {
  return dayjs().toISOString();
}

// Get month-year string (YYYY-MM)
export function getMonthYear(date: string | Date): string {
  return dayjs(date).format(DATE_FORMATS.MONTH_YEAR);
}

// Get start and end of period
export function getPeriodBounds(date: string | Date, period: 'day' | 'month' | 'year'): {
  start: string;
  end: string;
} {
  const dateObj = dayjs(date);

  let start: dayjs.Dayjs;
  let end: dayjs.Dayjs;

  switch (period) {
    case 'day':
      start = dateObj.startOf('day');
      end = dateObj.endOf('day');
      break;
    case 'month':
      start = dateObj.startOf('month');
      end = dateObj.endOf('month');
      break;
    case 'year':
      start = dateObj.startOf('year');
      end = dateObj.endOf('year');
      break;
    default:
      throw new Error(`Unsupported period: ${period}`);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

// Get month bounds from YYYY-MM string
export function getMonthBounds(monthYear: string): { start: string; end: string } {
  const [year, month] = monthYear.split('-').map(Number);
  const date = dayjs().year(year).month(month - 1).date(1);
  return getPeriodBounds(date.toDate(), 'month');
}

// Get date range for last N days
export function getLastNDays(days: number): { start: string; end: string } {
  const end = dayjs();
  const start = end.subtract(days, 'day');

  return {
    start: start.startOf('day').toISOString(),
    end: end.endOf('day').toISOString(),
  };
}

// Get date range for last N months
export function getLastNMonths(months: number): { start: string; end: string } {
  const end = dayjs();
  const start = end.subtract(months, 'month').startOf('month');

  return {
    start: start.toISOString(),
    end: end.endOf('month').toISOString(),
  };
}

// Add time to date
export function addTime(
  date: string | Date,
  amount: number,
  unit: 'days' | 'weeks' | 'months' | 'years'
): string {
  const dateObj = dayjs(date);

  let result: dayjs.Dayjs;

  switch (unit) {
    case 'days':
      result = dateObj.add(amount, 'day');
      break;
    case 'weeks':
      result = dateObj.add(amount, 'week');
      break;
    case 'months':
      result = dateObj.add(amount, 'month');
      break;
    case 'years':
      result = dateObj.add(amount, 'year');
      break;
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }

  return result.toISOString();
}

// Calculate difference between dates
export function dateDifference(
  startDate: string | Date,
  endDate: string | Date,
  unit: 'days' | 'months' = 'days'
): number {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  return end.diff(start, unit);
}

// Check if date is in range
export function isDateInRange(
  date: string | Date,
  startDate: string | Date,
  endDate: string | Date
): boolean {
  const checkDate = dayjs(date);
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  return checkDate.isSameOrAfter(start) && checkDate.isSameOrBefore(end);
}

// Get month names
export function getMonthNames(): string[] {
  return [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
}

// Get short month names
export function getShortMonthNames(): string[] {
  return [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
}

// Get weekday names
export function getWeekdayNames(): string[] {
  return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
}

// Get short weekday names
export function getShortWeekdayNames(): string[] {
  return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
}

// Get relative time string
export function getRelativeTime(date: string | Date): string {
  const dateObj = dayjs(date);
  const now = dayjs();
  const diffInDays = now.diff(dateObj, 'day');

  if (diffInDays === 0) {
    return 'Hoy';
  } else if (diffInDays === 1) {
    return 'Ayer';
  } else if (diffInDays === -1) {
    return 'Mañana';
  } else if (diffInDays > 1 && diffInDays <= 7) {
    return `Hace ${diffInDays} días`;
  } else if (diffInDays < -1 && diffInDays >= -7) {
    return `En ${Math.abs(diffInDays)} días`;
  } else {
    return formatDate(dateObj.toDate(), 'DISPLAY_SHORT');
  }
}

// Validate date string
export function isValidDateString(dateStr: string, formatStr?: string): boolean {
  if (!dateStr) return false;

  try {
    const parsed = formatStr ? dayjs(dateStr, formatStr) : dayjs(dateStr);
    return parsed.isValid();
  } catch {
    return false;
  }
}

// Get fiscal year start date (assuming fiscal year starts in January)
export function getFiscalYearStart(date: string | Date): string {
  const dateObj = dayjs(date);
  const year = dateObj.year();
  return dayjs().year(year).month(0).date(1).toISOString(); // January 1st
}

// Get fiscal year end date
export function getFiscalYearEnd(date: string | Date): string {
  const dateObj = dayjs(date);
  const year = dateObj.year();
  return dayjs().year(year).month(11).date(31).hour(23).minute(59).second(59).millisecond(999).toISOString(); // December 31st
}

// Generate date range array
export function generateDateRange(
  startDate: string | Date,
  endDate: string | Date,
  unit: 'days' | 'months' = 'days'
): string[] {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  const dates: string[] = [];
  let current = start;

  while (current.isSameOrBefore(end)) {
    dates.push(current.toISOString());

    if (unit === 'days') {
      current = current.add(1, 'day');
    } else if (unit === 'months') {
      current = current.add(1, 'month');
    }
  }

  return dates;
}

// Get business days between dates (excluding weekends)
export function getBusinessDays(startDate: string | Date, endDate: string | Date): number {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  let businessDays = 0;
  let current = start;

  while (current.isSameOrBefore(end)) {
    const dayOfWeek = current.day();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDays++;
    }
    current = current.add(1, 'day');
  }

  return businessDays;
}
