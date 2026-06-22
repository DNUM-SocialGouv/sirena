export function formatExportDate(date: Date | null | undefined): string {
  if (!date) {
    return '';
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

export function formatExportYear(date: Date | null | undefined): string {
  if (!date) {
    return '';
  }

  return String(date.getUTCFullYear());
}

export function formatExportBoolean(value: boolean | null | undefined): string {
  if (value == null) {
    return '';
  }

  return value ? 'Oui' : 'Non';
}

export function formatExportList(values: Array<string | null | undefined>): string {
  return values.filter((value): value is string => value != null && value !== '').join(', ');
}
