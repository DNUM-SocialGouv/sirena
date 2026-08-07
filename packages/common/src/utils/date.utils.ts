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
