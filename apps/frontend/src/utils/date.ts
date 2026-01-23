export function formatDateToFrenchLocale(date: string | Date | null | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return new Date(date).toLocaleDateString('fr-FR');
  if (date instanceof Date) return date.toLocaleDateString('fr-FR');
  return undefined;
}
