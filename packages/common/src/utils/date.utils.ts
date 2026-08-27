const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const REQUETE_OVER_90_DAYS_THRESHOLD = 90;

const toMidnightTimestamp = (date: Date): number => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

export const isCreatedOver90DaysAgo = (createdAt: Date, now: Date = new Date()): boolean =>
  toMidnightTimestamp(now) - toMidnightTimestamp(createdAt) >= REQUETE_OVER_90_DAYS_THRESHOLD * DAY_IN_MS;

export const getOver90DaysCutoffDate = (now: Date = new Date()): Date =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() - (REQUETE_OVER_90_DAYS_THRESHOLD - 1));

export const getDateTodayInParis = (): string => {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Unable to format current date in Europe/Paris timezone');
  }

  return `${year}-${month}-${day}`;
};

export const DEFAULT_TIME_ZONE = 'Europe/Paris';

const buildWallClockFormatter = (timeZone: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

export const isSupportedTimeZone = (timeZone: string): boolean => {
  try {
    buildWallClockFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
};

/**
 * ZIP entries store timestamps as timezone-less DOS date/time, read back by extractors as local wall clock.
 * Moving the wall clock of the reader's timezone into the UTC fields of the returned date makes archives
 * display the expected local time, whichever timezone the server runs in.
 */
export const toWallClockDate = (date: Date, timeZone: string = DEFAULT_TIME_ZONE): Date => {
  const formatter = buildWallClockFormatter(isSupportedTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE);
  const parts = formatter.formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value;
    if (value === undefined) {
      throw new Error(`Unable to format date in ${timeZone} timezone`);
    }
    return Number(value);
  };

  return new Date(
    Date.UTC(
      getPart('year'),
      getPart('month') - 1,
      getPart('day'),
      getPart('hour'),
      getPart('minute'),
      getPart('second'),
    ),
  );
};
