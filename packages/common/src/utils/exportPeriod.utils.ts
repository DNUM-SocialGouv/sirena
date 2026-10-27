import {
  EXPORT_REQUETES_ERROR_CODES,
  EXPORT_REQUETES_MAX_PERIOD_MONTHS,
  type ExportRequetesErrorCode,
} from '../constants/exportRequetes.constant.js';

// Calendar dates are handled as ISO strings (YYYY-MM-DD): plain string comparison orders them,
// and no timezone can shift a day.
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

const daysInMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

export const isValidIsoDate = (value: string | null | undefined): value is string => {
  const match = value ? ISO_DATE_PATTERN.exec(value) : null;
  if (!match) return false;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  return monthIndex >= 0 && monthIndex < 12 && day >= 1 && day <= daysInMonth(year, monthIndex);
};

/**
 * Moves an ISO date by a number of months, keeping the day of the month. When that day does not
 * exist in the target month, the last day of that month is used (31 March - 1 month = 28/29 February).
 */
export const shiftIsoDateByMonths = (isoDate: string, months: number): string => {
  if (!isValidIsoDate(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  const [year, month, day] = isoDate.split('-').map(Number);
  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = totalMonths - targetYear * 12;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonthIndex));

  return `${pad(targetYear, 4)}-${pad(targetMonthIndex + 1)}-${pad(targetDay)}`;
};

export const addDaysToIsoDate = (isoDate: string, days: number): string => {
  if (!isValidIsoDate(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export type ExportPeriod = {
  startDate: string;
  endDate: string;
};

export const getDefaultExportPeriod = (today: string): ExportPeriod => ({
  startDate: shiftIsoDateByMonths(today, -1),
  endDate: today,
});

export type ExportPeriodField = keyof ExportPeriod;

export type ExportPeriodError = {
  field: ExportPeriodField;
  code: ExportRequetesErrorCode;
};

/**
 * Checks an export period against the SIRENA-915 rules. `today` is the current date in the
 * user's calendar (Europe/Paris). Returns the first error found, or null when the period is valid.
 */
export const validateExportPeriod = (
  period: { startDate?: string | null; endDate?: string | null },
  today: string,
): ExportPeriodError | null => {
  const { startDate, endDate } = period;

  if (!isValidIsoDate(startDate)) {
    return { field: 'startDate', code: EXPORT_REQUETES_ERROR_CODES.START_DATE_REQUIRED };
  }
  if (!isValidIsoDate(endDate)) {
    return { field: 'endDate', code: EXPORT_REQUETES_ERROR_CODES.END_DATE_REQUIRED };
  }
  if (startDate > endDate) {
    return { field: 'startDate', code: EXPORT_REQUETES_ERROR_CODES.START_AFTER_END };
  }
  if (endDate > today) {
    return { field: 'endDate', code: EXPORT_REQUETES_ERROR_CODES.END_DATE_IN_FUTURE };
  }
  if (endDate > shiftIsoDateByMonths(startDate, EXPORT_REQUETES_MAX_PERIOD_MONTHS)) {
    return { field: 'startDate', code: EXPORT_REQUETES_ERROR_CODES.PERIOD_TOO_LONG };
  }

  return null;
};
