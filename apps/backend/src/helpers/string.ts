export const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const formatDateFr = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
