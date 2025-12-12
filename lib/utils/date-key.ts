const DEFAULT_LOCALE = 'en-CA';

export const CARACAS_TIME_ZONE = 'America/Caracas';

export function formatTimeZoneDayKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  if (!year || !month || !day) {
    return date.toISOString().split('T')[0];
  }

  return `${year}-${month}-${day}`;
}

export function formatCaracasDayKey(date: Date): string {
  return formatTimeZoneDayKey(date, CARACAS_TIME_ZONE);
}

