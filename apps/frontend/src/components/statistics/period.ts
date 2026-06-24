export const PERIOD_PRESETS = ['current-week', 'current-month', 'current-year', 'rolling-month'] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  'current-week': 'Semaine courante',
  'current-month': 'Mois courant',
  'current-year': 'Année courante',
  'rolling-month': 'Mois glissant',
};

export type DateRange = { startDate?: string; endDate?: string };

export type PeriodSelection = DateRange & { period?: PeriodPreset };

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolvePeriodPreset(preset: PeriodPreset, today: Date): Required<DateRange> {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  switch (preset) {
    case 'current-week': {
      const dayOfWeek = (today.getDay() + 6) % 7;
      return {
        startDate: toIsoDate(new Date(year, month, day - dayOfWeek)),
        endDate: toIsoDate(new Date(year, month, day - dayOfWeek + 6)),
      };
    }
    case 'current-month':
      return {
        startDate: toIsoDate(new Date(year, month, 1)),
        endDate: toIsoDate(new Date(year, month + 1, 0)),
      };
    case 'current-year':
      return {
        startDate: toIsoDate(new Date(year, 0, 1)),
        endDate: toIsoDate(new Date(year, 11, 31)),
      };
    case 'rolling-month':
      return {
        startDate: toIsoDate(new Date(year, month - 1, day)),
        endDate: toIsoDate(today),
      };
  }
}

export function resolveDateRange(selection: PeriodSelection, today: Date): DateRange {
  if (selection.period) return resolvePeriodPreset(selection.period, today);
  return { startDate: selection.startDate, endDate: selection.endDate };
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR');

function formatDisplayDate(value?: string): string | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return dateFormatter.format(new Date(year, month - 1, day));
}

export function describePeriod(selection: PeriodSelection): string | null {
  if (selection.period) return PERIOD_PRESET_LABELS[selection.period];

  const start = formatDisplayDate(selection.startDate);
  const end = formatDisplayDate(selection.endDate);
  if (start && end) return `du ${start} au ${end}`;
  if (start) return `à partir du ${start}`;
  if (end) return `jusqu'au ${end}`;
  return null;
}
