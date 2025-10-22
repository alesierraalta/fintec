/**
 * Time period utilities for filtering transactions and reports
 */

export interface TimePeriod {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
}

export function getTimePeriods(): TimePeriod[] {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  return [
    {
      id: 'today',
      label: 'Hoy',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    },
    {
      id: 'yesterday',
      label: 'Ayer',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59)
    },
    {
      id: 'this-week',
      label: 'Esta Semana',
      startDate: getStartOfWeek(today),
      endDate: getEndOfWeek(today)
    },
    {
      id: 'last-week',
      label: 'Semana Pasada',
      startDate: getStartOfWeek(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
      endDate: getEndOfWeek(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
    },
    {
      id: 'this-month',
      label: 'Este Mes',
      startDate: new Date(currentYear, currentMonth, 1),
      endDate: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
    },
    {
      id: 'last-month',
      label: 'Mes Pasado',
      startDate: new Date(currentYear, currentMonth - 1, 1),
      endDate: new Date(currentYear, currentMonth, 0, 23, 59, 59)
    },
    {
      id: 'this-quarter',
      label: 'Este Trimestre',
      startDate: getStartOfQuarter(today),
      endDate: getEndOfQuarter(today)
    },
    {
      id: 'last-quarter',
      label: 'Trimestre Pasado',
      startDate: getStartOfQuarter(new Date(currentYear, currentMonth - 3, 1)),
      endDate: getEndOfQuarter(new Date(currentYear, currentMonth - 3, 1))
    },
    {
      id: 'this-year',
      label: 'Este Año',
      startDate: new Date(currentYear, 0, 1),
      endDate: new Date(currentYear, 11, 31, 23, 59, 59)
    },
    {
      id: 'last-year',
      label: 'Año Pasado',
      startDate: new Date(currentYear - 1, 0, 1),
      endDate: new Date(currentYear - 1, 11, 31, 23, 59, 59)
    },
    {
      id: 'last-7-days',
      label: 'Últimos 7 Días',
      startDate: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
      endDate: today
    },
    {
      id: 'last-30-days',
      label: 'Últimos 30 Días',
      startDate: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
      endDate: today
    },
    {
      id: 'last-90-days',
      label: 'Últimos 90 Días',
      startDate: new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000),
      endDate: today
    }
  ];
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
}

function getEndOfWeek(date: Date): Date {
  const startOfWeek = getStartOfWeek(date);
  return new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
}

function getStartOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
}

function getEndOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
}

export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getPeriodById(periodId: string): TimePeriod | null {
  return getTimePeriods().find(period => period.id === periodId) || null;
}
