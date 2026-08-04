export type ReportPeriod =
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'custom'
  | string;

export interface CustomDateRange {
  start: string; // Format: "YYYY-MM-DD"
  end: string; // Format: "YYYY-MM-DD"
}

export interface PeriodBoundaryRange {
  start: Date;
  end: Date;
}

/**
 * Safely parses a YYYY-MM-DD date string, ISO string, or Date into a local Date object
 * using local numeric component extraction to prevent UTC midnight shifts in negative timezones.
 */
export function parseLocalDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getTime());
  }

  if (typeof dateInput === 'string' && dateInput.trim().length > 0) {
    const match = dateInput
      .trim()
      .match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3,}))?)?)?/
      );

    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const hours = match[4] ? parseInt(match[4], 10) : 0;
      const minutes = match[5] ? parseInt(match[5], 10) : 0;
      const seconds = match[6] ? parseInt(match[6], 10) : 0;
      const ms = match[7] ? parseInt(match[7].slice(0, 3), 10) : 0;

      return new Date(year, month, day, hours, minutes, seconds, ms);
    }

    const fallback = new Date(dateInput);
    if (!isNaN(fallback.getTime())) {
      return fallback;
    }
  }

  return new Date();
}

/**
 * Calculates strict inclusive start (00:00:00.000) and end (23:59:59.999) dates for a given report period.
 */
export function getPeriodRange(
  period: ReportPeriod,
  referenceDate?: Date,
  customRange?: CustomDateRange
): PeriodBoundaryRange {
  const ref = referenceDate ? parseLocalDate(referenceDate) : new Date();
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const date = ref.getDate();

  switch (period) {
    case 'year': {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }

    case 'month': {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }

    case 'quarter': {
      const q = Math.floor(month / 3);
      const start = new Date(year, q * 3, 1, 0, 0, 0, 0);
      const end = new Date(year, q * 3 + 3, 0, 23, 59, 59, 999);
      return { start, end };
    }

    case 'week': {
      const start = new Date(year, month, date - 6, 0, 0, 0, 0);
      const end = new Date(year, month, date, 23, 59, 59, 999);
      return { start, end };
    }

    case 'custom': {
      if (customRange?.start && customRange?.end) {
        const parsedStart = parseLocalDate(customRange.start);
        const parsedEnd = parseLocalDate(customRange.end);
        const start = new Date(
          parsedStart.getFullYear(),
          parsedStart.getMonth(),
          parsedStart.getDate(),
          0,
          0,
          0,
          0
        );
        const end = new Date(
          parsedEnd.getFullYear(),
          parsedEnd.getMonth(),
          parsedEnd.getDate(),
          23,
          59,
          59,
          999
        );
        return { start, end };
      }
      // Fallback if customRange is incomplete
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }

    default: {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
  }
}

/**
 * Formats a Date object into a trend bucket key (YYYY-MM for long periods, YYYY-MM-DD for short).
 */
export function formatPeriodKey(date: Date, isLongPeriod: boolean): string {
  const d = parseLocalDate(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  if (isLongPeriod) {
    return `${y}-${m}`;
  }
  return `${y}-${m}-${day}`;
}

/**
 * Generates an array of formatted keys covering the full date range for chart rendering.
 */
export function generatePeriodTrendKeys(
  period: ReportPeriod,
  isLongPeriod: boolean,
  referenceDate?: Date,
  customRange?: CustomDateRange
): string[] {
  const ref = referenceDate ? parseLocalDate(referenceDate) : new Date();
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const date = ref.getDate();
  const keys: string[] = [];

  switch (period) {
    case 'week': {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(year, month, date - i);
        keys.push(formatPeriodKey(d, false));
      }
      break;
    }

    case 'month': {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        keys.push(formatPeriodKey(d, false));
      }
      break;
    }

    case 'quarter': {
      const q = Math.floor(month / 3);
      for (let i = 0; i < 3; i++) {
        const d = new Date(year, q * 3 + i, 1);
        keys.push(formatPeriodKey(d, true));
      }
      break;
    }

    case 'year': {
      for (let i = 0; i < 12; i++) {
        const d = new Date(year, i, 1);
        keys.push(formatPeriodKey(d, true));
      }
      break;
    }

    case 'custom': {
      if (customRange?.start && customRange?.end) {
        const start = parseLocalDate(customRange.start);
        const end = parseLocalDate(customRange.end);

        if (isLongPeriod) {
          const current = new Date(start.getFullYear(), start.getMonth(), 1);
          const endYM = end.getFullYear() * 12 + end.getMonth();
          let currentYM = current.getFullYear() * 12 + current.getMonth();
          let safety = 0;

          while (currentYM <= endYM && safety < 1000) {
            keys.push(formatPeriodKey(current, true));
            current.setMonth(current.getMonth() + 1);
            currentYM = current.getFullYear() * 12 + current.getMonth();
            safety++;
          }
        } else {
          const current = new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
          );
          const endTs = new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate()
          ).getTime();
          let safety = 0;

          while (current.getTime() <= endTs && safety < 1000) {
            keys.push(formatPeriodKey(current, false));
            current.setDate(current.getDate() + 1);
            safety++;
          }
        }
      } else {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(year, month, i);
          keys.push(formatPeriodKey(d, false));
        }
      }
      break;
    }

    default: {
      if (isLongPeriod) {
        for (let i = 0; i < 12; i++) {
          const d = new Date(year, i, 1);
          keys.push(formatPeriodKey(d, true));
        }
      } else {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(year, month, i);
          keys.push(formatPeriodKey(d, false));
        }
      }
      break;
    }
  }

  return keys;
}
