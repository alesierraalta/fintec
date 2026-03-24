import {
  formatDate,
  parseDate,
  getCurrentDate,
  getCurrentDateTime,
  getMonthYear,
  getPeriodBounds,
  getMonthBounds,
  getLastNDays,
  getLastNMonths,
  addTime,
  dateDifference,
  isDateInRange,
  getMonthNames,
  getShortMonthNames,
  getWeekdayNames,
  getShortWeekdayNames,
  getRelativeTime,
  isValidDateString,
  getFiscalYearStart,
  getFiscalYearEnd,
  generateDateRange,
  getBusinessDays,
  DATE_FORMATS,
} from '../../../lib/dates';

const toLocalIso = (
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0
) =>
  new Date(
    year,
    monthIndex,
    day,
    hours,
    minutes,
    seconds,
    milliseconds
  ).toISOString();

describe('dates utils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-23T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatDate', () => {
    it('formats valid date using default format', () => {
      expect(
        formatDate(new Date('2026-03-23T12:00:00Z'), 'DISPLAY_SHORT')
      ).toBe('23/03/2026');
    });

    it('formats valid date using custom format', () => {
      expect(formatDate(new Date('2026-03-23T12:00:00Z'), 'YYYY-MM-DD')).toBe(
        '2026-03-23'
      );
    });

    it('returns "Fecha inválida" for invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Fecha inválida');
    });
  });

  describe('parseDate', () => {
    it('parses valid date string', () => {
      const parsed = parseDate('2026-03-23', DATE_FORMATS.ISO);
      expect(parsed?.toISOString()).toMatch('2026-03-23');
    });

    it('returns null for invalid date string', () => {
      expect(parseDate('invalid', DATE_FORMATS.ISO)).toBeNull();
    });
  });

  describe('getCurrentDate & getCurrentDateTime', () => {
    it('returns current date in ISO format', () => {
      expect(getCurrentDate()).toBe('2026-03-23');
    });

    it('returns current datetime in ISO format', () => {
      expect(getCurrentDateTime()).toBe('2026-03-23T12:00:00.000Z');
    });
  });

  describe('getMonthYear', () => {
    it('returns YYYY-MM format', () => {
      expect(getMonthYear(new Date('2026-03-23T12:00:00.000Z'))).toBe(
        '2026-03'
      );
    });
  });

  describe('getPeriodBounds', () => {
    it('returns correct bounds for day', () => {
      const bounds = getPeriodBounds(
        new Date('2026-03-23T12:00:00.000Z'),
        'day'
      );
      expect(bounds.start).toBe(toLocalIso(2026, 2, 23));
      expect(bounds.end).toBe(toLocalIso(2026, 2, 23, 23, 59, 59, 999));
    });

    it('returns correct bounds for month', () => {
      const bounds = getPeriodBounds(
        new Date('2026-03-23T12:00:00.000Z'),
        'month'
      );
      expect(bounds.start).toBe(toLocalIso(2026, 2, 1));
      expect(bounds.end).toBe(toLocalIso(2026, 2, 31, 23, 59, 59, 999));
    });

    it('returns correct bounds for year', () => {
      const bounds = getPeriodBounds(
        new Date('2026-03-23T12:00:00.000Z'),
        'year'
      );
      expect(bounds.start).toBe(toLocalIso(2026, 0, 1));
      expect(bounds.end).toBe(toLocalIso(2026, 11, 31, 23, 59, 59, 999));
    });

    it('throws error for unsupported period', () => {
      expect(() => getPeriodBounds(new Date(), 'invalid' as any)).toThrow();
    });
  });

  describe('getMonthBounds', () => {
    it('returns correct bounds from YYYY-MM string', () => {
      const bounds = getMonthBounds('2026-03');
      expect(bounds.start).toBe(toLocalIso(2026, 2, 1));
      expect(bounds.end).toBe(toLocalIso(2026, 2, 31, 23, 59, 59, 999));
    });
  });

  describe('getLastNDays', () => {
    it('returns correct bounds for last 7 days', () => {
      const bounds = getLastNDays(7);
      expect(bounds.start).toBe(toLocalIso(2026, 2, 16));
      expect(bounds.end).toBe(toLocalIso(2026, 2, 23, 23, 59, 59, 999));
    });
  });

  describe('getLastNMonths', () => {
    it('returns correct bounds for last 3 months', () => {
      const bounds = getLastNMonths(3);
      expect(bounds.start).toBe(toLocalIso(2025, 11, 1));
      expect(bounds.end).toBe(toLocalIso(2026, 2, 31, 23, 59, 59, 999));
    });
  });

  describe('addTime', () => {
    it('adds days correctly', () => {
      expect(addTime('2026-03-23T12:00:00.000Z', 2, 'days')).toBe(
        '2026-03-25T12:00:00.000Z'
      );
    });

    it('adds weeks correctly', () => {
      expect(addTime('2026-03-23T12:00:00.000Z', 1, 'weeks')).toBe(
        '2026-03-30T12:00:00.000Z'
      );
    });

    it('adds months correctly', () => {
      expect(addTime('2026-03-23T12:00:00.000Z', 1, 'months')).toBe(
        '2026-04-23T12:00:00.000Z'
      );
    });

    it('adds years correctly', () => {
      expect(addTime('2026-03-23T12:00:00.000Z', 1, 'years')).toBe(
        '2027-03-23T12:00:00.000Z'
      );
    });

    it('throws error for unsupported unit', () => {
      expect(() =>
        addTime('2026-03-23T12:00:00.000Z', 1, 'invalid' as any)
      ).toThrow();
    });
  });

  describe('dateDifference', () => {
    it('calculates difference in days', () => {
      expect(
        dateDifference(
          '2026-03-20T12:00:00.000Z',
          '2026-03-25T12:00:00.000Z',
          'days'
        )
      ).toBe(5);
    });

    it('calculates difference in months', () => {
      expect(
        dateDifference(
          '2026-01-20T12:00:00.000Z',
          '2026-03-25T12:00:00.000Z',
          'months'
        )
      ).toBe(2);
    });
  });

  describe('isDateInRange', () => {
    it('returns true if date is within range', () => {
      expect(isDateInRange('2026-03-23', '2026-03-20', '2026-03-25')).toBe(
        true
      );
    });

    it('returns false if date is outside range', () => {
      expect(isDateInRange('2026-03-28', '2026-03-20', '2026-03-25')).toBe(
        false
      );
    });
  });

  describe('lists (names)', () => {
    it('returns month names', () => {
      expect(getMonthNames()).toHaveLength(12);
      expect(getMonthNames()[0]).toBe('Enero');
    });

    it('returns short month names', () => {
      expect(getShortMonthNames()).toHaveLength(12);
      expect(getShortMonthNames()[0]).toBe('Ene');
    });

    it('returns weekday names', () => {
      expect(getWeekdayNames()).toHaveLength(7);
      expect(getWeekdayNames()[0]).toBe('Domingo');
    });

    it('returns short weekday names', () => {
      expect(getShortWeekdayNames()).toHaveLength(7);
      expect(getShortWeekdayNames()[0]).toBe('Dom');
    });
  });

  describe('getRelativeTime', () => {
    it('returns Hoy for 0 diff', () => {
      expect(getRelativeTime('2026-03-23T08:00:00.000Z')).toBe('Hoy');
    });

    it('returns Ayer for 1 day ago', () => {
      expect(getRelativeTime('2026-03-22T08:00:00.000Z')).toBe('Ayer');
    });

    it('returns Mañana for 1 day ahead', () => {
      expect(getRelativeTime('2026-03-24T12:00:01.000Z')).toBe('Mañana');
    });

    it('returns Hace N días', () => {
      expect(getRelativeTime('2026-03-20T08:00:00.000Z')).toBe('Hace 3 días');
    });

    it('returns En N días', () => {
      expect(getRelativeTime('2026-03-26T12:00:01.000Z')).toBe('En 3 días');
    });

    it('returns formatted string for more than 7 days ago', () => {
      expect(getRelativeTime('2026-03-10T08:00:00.000Z')).toBe('10/03/2026');
    });
  });

  describe('isValidDateString', () => {
    it('returns false for empty string', () => {
      expect(isValidDateString('')).toBe(false);
    });

    it('returns true for valid string without format', () => {
      expect(isValidDateString('2026-03-23')).toBe(true);
    });

    it('returns true for valid string with format', () => {
      expect(isValidDateString('23/03/2026', 'DD/MM/YYYY')).toBe(true);
    });

    it('returns false for invalid string with format', () => {
      expect(isValidDateString('not-a-date', 'DD/MM/YYYY')).toBe(false);
    });
  });

  describe('Fiscal year', () => {
    it('returns start of fiscal year', () => {
      expect(getFiscalYearStart('2026-03-23')).toBe('2026-01-01T12:00:00.000Z');
    });

    it('returns end of fiscal year', () => {
      expect(getFiscalYearEnd('2026-03-23')).toBe(
        toLocalIso(2026, 11, 31, 23, 59, 59, 999)
      );
    });
  });

  describe('generateDateRange', () => {
    it('generates daily range', () => {
      const dates = generateDateRange('2026-03-20', '2026-03-22', 'days');
      expect(dates).toHaveLength(3);
    });

    it('generates monthly range', () => {
      const dates = generateDateRange('2026-01-20', '2026-03-20', 'months');
      expect(dates).toHaveLength(3);
    });
  });

  describe('getBusinessDays', () => {
    it('returns business days without weekends', () => {
      // 2026-03-20 is Friday
      // 2026-03-25 is Wednesday
      // Fri, Mon, Tue, Wed = 4 business days
      expect(
        getBusinessDays('2026-03-20T12:00:00Z', '2026-03-25T12:00:00Z')
      ).toBe(4);
    });
  });
});
