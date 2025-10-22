// Date utility functions for the finance application

import { format, parse, isValid, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears, differenceInDays, differenceInMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const DATE_FORMATS = {
  ISO: 'yyyy-MM-dd',
  ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  DISPLAY_SHORT: 'dd/MM/yyyy',
  DISPLAY_MEDIUM: 'dd MMM yyyy',
  DISPLAY_LONG: 'dd MMMM yyyy',
  MONTH_YEAR: 'yyyy-MM',
  MONTH_NAME: 'MMMM yyyy',
} as const;

// Format date for display
export function formatDate(
  date: string | Date,
  formatStr: keyof typeof DATE_FORMATS | string = 'DISPLAY_MEDIUM'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Fecha inválida';
  }

  const formatPattern = DATE_FORMATS[formatStr as keyof typeof DATE_FORMATS] || formatStr;
  return format(dateObj, formatPattern, { locale: es });
}

// Parse date string
export function parseDate(dateStr: string, formatStr: string = DATE_FORMATS.ISO): Date | null {
  try {
    const parsed = parse(dateStr, formatStr, new Date());
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Get current date in ISO format
export function getCurrentDate(): string {
  return format(new Date(), DATE_FORMATS.ISO);
}

// Get current datetime in ISO format
export function getCurrentDateTime(): string {
  return new Date().toISOString();
}

// Get month-year string (YYYY-MM)
export function getMonthYear(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, DATE_FORMATS.MONTH_YEAR);
}

// Get start and end of period
export function getPeriodBounds(date: string | Date, period: 'day' | 'month' | 'year'): {
  start: string;
  end: string;
} {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  let start: Date;
  let end: Date;

  switch (period) {
    case 'day':
      start = startOfDay(dateObj);
      end = endOfDay(dateObj);
      break;
    case 'month':
      start = startOfMonth(dateObj);
      end = endOfMonth(dateObj);
      break;
    case 'year':
      start = startOfYear(dateObj);
      end = endOfYear(dateObj);
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
  const date = new Date(year, month - 1, 1);
  return getPeriodBounds(date, 'month');
}

// Get date range for last N days
export function getLastNDays(days: number): { start: string; end: string } {
  const end = new Date();
  const start = addDays(end, -days);
  
  return {
    start: startOfDay(start).toISOString(),
    end: endOfDay(end).toISOString(),
  };
}

// Get date range for last N months
export function getLastNMonths(months: number): { start: string; end: string } {
  const end = new Date();
  const start = addMonths(startOfMonth(end), -months);
  
  return {
    start: start.toISOString(),
    end: endOfMonth(end).toISOString(),
  };
}

// Add time to date
export function addTime(
  date: string | Date,
  amount: number,
  unit: 'days' | 'weeks' | 'months' | 'years'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  let result: Date;
  
  switch (unit) {
    case 'days':
      result = addDays(dateObj, amount);
      break;
    case 'weeks':
      result = addWeeks(dateObj, amount);
      break;
    case 'months':
      result = addMonths(dateObj, amount);
      break;
    case 'years':
      result = addYears(dateObj, amount);
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
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  switch (unit) {
    case 'days':
      return differenceInDays(end, start);
    case 'months':
      return differenceInMonths(end, start);
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

// Check if date is in range
export function isDateInRange(
  date: string | Date,
  startDate: string | Date,
  endDate: string | Date
): boolean {
  const checkDate = typeof date === 'string' ? parseISO(date) : date;
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  return checkDate >= start && checkDate <= end;
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
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffInDays = differenceInDays(now, dateObj);
  
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
    return formatDate(dateObj, 'DISPLAY_SHORT');
  }
}

// Validate date string
export function isValidDateString(dateStr: string, formatStr?: string): boolean {
  if (!dateStr) return false;
  
  try {
    if (formatStr) {
      const parsed = parse(dateStr, formatStr, new Date());
      return isValid(parsed);
    } else {
      const parsed = parseISO(dateStr);
      return isValid(parsed);
    }
  } catch {
    return false;
  }
}

// Get fiscal year start date (assuming fiscal year starts in January)
export function getFiscalYearStart(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const year = dateObj.getFullYear();
  return new Date(year, 0, 1).toISOString(); // January 1st
}

// Get fiscal year end date
export function getFiscalYearEnd(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const year = dateObj.getFullYear();
  return new Date(year, 11, 31, 23, 59, 59, 999).toISOString(); // December 31st
}

// Generate date range array
export function generateDateRange(
  startDate: string | Date,
  endDate: string | Date,
  unit: 'days' | 'months' = 'days'
): string[] {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  const dates: string[] = [];
  let current = start;
  
  while (current <= end) {
    dates.push(current.toISOString());
    
    if (unit === 'days') {
      current = addDays(current, 1);
    } else if (unit === 'months') {
      current = addMonths(current, 1);
    }
  }
  
  return dates;
}

// Get business days between dates (excluding weekends)
export function getBusinessDays(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  let businessDays = 0;
  let current = start;
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDays++;
    }
    current = addDays(current, 1);
  }
  
  return businessDays;
}
