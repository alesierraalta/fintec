import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import calendar from 'dayjs/plugin/calendar';
import updateLocale from 'dayjs/plugin/updateLocale';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/es'; // Spanish locale

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(calendar);
dayjs.extend(updateLocale);
dayjs.extend(weekOfYear);
dayjs.extend(quarterOfYear);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

// Set default locale to Spanish
dayjs.locale('es');

// Custom locale updates for financial app
dayjs.updateLocale('es', {
  calendar: {
    lastDay: '[Ayer]',
    sameDay: '[Hoy]',
    nextDay: '[Mañana]',
    lastWeek: '[el] dddd [pasado]',
    nextWeek: 'dddd',
    sameElse: 'DD/MM/YYYY'
  },
  relativeTime: {
    future: 'en %s',
    past: 'hace %s',
    s: 'unos segundos',
    m: 'un minuto',
    mm: '%d minutos',
    h: 'una hora',
    hh: '%d horas',
    d: 'un día',
    dd: '%d días',
    M: 'un mes',
    MM: '%d meses',
    y: 'un año',
    yy: '%d años'
  }
});

// Common date formats
export const DATE_FORMATS = {
  API: 'YYYY-MM-DD',
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  TIME: 'HH:mm',
  MONTH_YEAR: 'MMMM YYYY',
  SHORT_DATE: 'DD MMM',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
} as const;

// Utility functions for financial app
export const dateUtils = {
  // Format dates for display
  formatForDisplay: (date: dayjs.ConfigType) => dayjs(date).format(DATE_FORMATS.DISPLAY),
  formatForAPI: (date: dayjs.ConfigType) => dayjs(date).format(DATE_FORMATS.API),
  formatForDisplayWithTime: (date: dayjs.ConfigType) => dayjs(date).format(DATE_FORMATS.DISPLAY_WITH_TIME),
  formatTime: (date: dayjs.ConfigType) => dayjs(date).format(DATE_FORMATS.TIME),
  formatMonthYear: (date: dayjs.ConfigType) => dayjs(date).format(DATE_FORMATS.MONTH_YEAR),
  formatShortDate: (date: dayjs.ConfigType) => dayjs(date).format(DATE_FORMATS.SHORT_DATE),

  // Relative time
  fromNow: (date: dayjs.ConfigType) => dayjs(date).fromNow(),
  toNow: (date: dayjs.ConfigType) => dayjs(date).toNow(),
  calendar: (date: dayjs.ConfigType) => dayjs(date).calendar(),

  // Date operations
  startOfDay: (date: dayjs.ConfigType) => dayjs(date).startOf('day'),
  endOfDay: (date: dayjs.ConfigType) => dayjs(date).endOf('day'),
  startOfMonth: (date: dayjs.ConfigType) => dayjs(date).startOf('month'),
  endOfMonth: (date: dayjs.ConfigType) => dayjs(date).endOf('month'),
  startOfYear: (date: dayjs.ConfigType) => dayjs(date).startOf('year'),
  endOfYear: (date: dayjs.ConfigType) => dayjs(date).endOf('year'),
  startOfWeek: (date: dayjs.ConfigType) => dayjs(date).startOf('week'),
  endOfWeek: (date: dayjs.ConfigType) => dayjs(date).endOf('week'),

  // Add/subtract
  addDays: (date: dayjs.ConfigType, days: number) => dayjs(date).add(days, 'day'),
  subtractDays: (date: dayjs.ConfigType, days: number) => dayjs(date).subtract(days, 'day'),
  addMonths: (date: dayjs.ConfigType, months: number) => dayjs(date).add(months, 'month'),
  subtractMonths: (date: dayjs.ConfigType, months: number) => dayjs(date).subtract(months, 'month'),
  addYears: (date: dayjs.ConfigType, years: number) => dayjs(date).add(years, 'year'),
  subtractYears: (date: dayjs.ConfigType, years: number) => dayjs(date).subtract(years, 'year'),

  // Comparisons
  isBefore: (date1: dayjs.ConfigType, date2: dayjs.ConfigType) => dayjs(date1).isBefore(date2),
  isAfter: (date1: dayjs.ConfigType, date2: dayjs.ConfigType) => dayjs(date1).isAfter(date2),
  isSame: (date1: dayjs.ConfigType, date2: dayjs.ConfigType, unit?: dayjs.OpUnitType) => dayjs(date1).isSame(date2, unit),
  isSameOrBefore: (date1: dayjs.ConfigType, date2: dayjs.ConfigType) => dayjs(date1).isSameOrBefore(date2),
  isSameOrAfter: (date1: dayjs.ConfigType, date2: dayjs.ConfigType) => dayjs(date1).isSameOrAfter(date2),
  isBetween: (date: dayjs.ConfigType, start: dayjs.ConfigType, end: dayjs.ConfigType) => 
    dayjs(date).isBetween(start, end, null, '[]'),

  // Validation
  isValid: (date: dayjs.ConfigType) => dayjs(date).isValid(),
  isToday: (date: dayjs.ConfigType) => dayjs(date).isSame(dayjs(), 'day'),
  isYesterday: (date: dayjs.ConfigType) => dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day'),
  isTomorrow: (date: dayjs.ConfigType) => dayjs(date).isSame(dayjs().add(1, 'day'), 'day'),
  isThisWeek: (date: dayjs.ConfigType) => dayjs(date).isSame(dayjs(), 'week'),
  isThisMonth: (date: dayjs.ConfigType) => dayjs(date).isSame(dayjs(), 'month'),
  isThisYear: (date: dayjs.ConfigType) => dayjs(date).isSame(dayjs(), 'year'),

  // Current date/time
  now: () => dayjs(),
  today: () => dayjs().startOf('day'),
  tomorrow: () => dayjs().add(1, 'day').startOf('day'),
  yesterday: () => dayjs().subtract(1, 'day').startOf('day'),

  // Financial periods
  getMonthStart: (date: dayjs.ConfigType) => dayjs(date).startOf('month'),
  getMonthEnd: (date: dayjs.ConfigType) => dayjs(date).endOf('month'),
  getQuarterStart: (date: dayjs.ConfigType) => dayjs(date).startOf('quarter'),
  getQuarterEnd: (date: dayjs.ConfigType) => dayjs(date).endOf('quarter'),
  getYearStart: (date: dayjs.ConfigType) => dayjs(date).startOf('year'),
  getYearEnd: (date: dayjs.ConfigType) => dayjs(date).endOf('year'),

  // Date ranges for financial reports
  getCurrentMonthRange: () => ({
    start: dayjs().startOf('month').format(DATE_FORMATS.API),
    end: dayjs().endOf('month').format(DATE_FORMATS.API),
  }),
  getLastMonthRange: () => ({
    start: dayjs().subtract(1, 'month').startOf('month').format(DATE_FORMATS.API),
    end: dayjs().subtract(1, 'month').endOf('month').format(DATE_FORMATS.API),
  }),
  getCurrentQuarterRange: () => ({
    start: dayjs().startOf('quarter').format(DATE_FORMATS.API),
    end: dayjs().endOf('quarter').format(DATE_FORMATS.API),
  }),
  getLastQuarterRange: () => ({
    start: dayjs().subtract(1, 'quarter').startOf('quarter').format(DATE_FORMATS.API),
    end: dayjs().subtract(1, 'quarter').endOf('quarter').format(DATE_FORMATS.API),
  }),
  getCurrentYearRange: () => ({
    start: dayjs().startOf('year').format(DATE_FORMATS.API),
    end: dayjs().endOf('year').format(DATE_FORMATS.API),
  }),
  getLastYearRange: () => ({
    start: dayjs().subtract(1, 'year').startOf('year').format(DATE_FORMATS.API),
    end: dayjs().subtract(1, 'year').endOf('year').format(DATE_FORMATS.API),
  }),
  getLast30DaysRange: () => ({
    start: dayjs().subtract(30, 'day').format(DATE_FORMATS.API),
    end: dayjs().format(DATE_FORMATS.API),
  }),
  getLast7DaysRange: () => ({
    start: dayjs().subtract(7, 'day').format(DATE_FORMATS.API),
    end: dayjs().format(DATE_FORMATS.API),
  }),

  // Timezone handling
  utc: (date?: dayjs.ConfigType) => dayjs.utc(date),
  tz: (date: dayjs.ConfigType, timezone: string) => dayjs(date).tz(timezone),
  getTimezone: () => dayjs.tz.guess(),

  // Duration
  duration: (time: number, unit?: any) => dayjs.duration(time, unit),
  getDaysBetween: (start: dayjs.ConfigType, end: dayjs.ConfigType) => 
    dayjs(end).diff(dayjs(start), 'day'),
  getMonthsBetween: (start: dayjs.ConfigType, end: dayjs.ConfigType) => 
    dayjs(end).diff(dayjs(start), 'month'),
  getYearsBetween: (start: dayjs.ConfigType, end: dayjs.ConfigType) => 
    dayjs(end).diff(dayjs(start), 'year'),

  // Parsing
  parse: (date: string, format: string) => dayjs(date, format),
  parseISO: (date: string) => dayjs(date),

  // Week operations
  getWeekOfYear: (date: dayjs.ConfigType) => dayjs(date).week(),
  getWeekday: (date: dayjs.ConfigType) => dayjs(date).day(),
  getWeekdayName: (date: dayjs.ConfigType) => dayjs(date).format('dddd'),
  getMonthName: (date: dayjs.ConfigType) => dayjs(date).format('MMMM'),

  // Financial year (assuming April to March)
  getFinancialYearStart: (date: dayjs.ConfigType) => {
    const d = dayjs(date);
    const year = d.month() >= 3 ? d.year() : d.year() - 1; // April is month 3 (0-indexed)
    return dayjs().year(year).month(3).startOf('month');
  },
  getFinancialYearEnd: (date: dayjs.ConfigType) => {
    const d = dayjs(date);
    const year = d.month() >= 3 ? d.year() + 1 : d.year();
    return dayjs().year(year).month(2).endOf('month'); // March is month 2 (0-indexed)
  },
};

// Export dayjs instance with all plugins
export default dayjs;
export { dayjs };
