import type { ReponseOuiNonValue } from '@sirena/common/schemas';
import { formatReponseOuiNon, toWallClockDate } from '@sirena/common/utils';

// Excel stops a cell at 32 767 characters and spills the rest; keep a margin for the
// formula-escaping quote the CSV serializer may add.
export const EXPORT_CELL_MAX_LENGTH = 32_000;
const TRUNCATED_SUFFIX = ' […] (texte tronqué)';

export function deriveDepartmentCodeFromPostalCode(codePostal: string): string {
  if (!/^\d{5}$/.test(codePostal)) {
    return '';
  }

  if (codePostal.startsWith('97') || codePostal.startsWith('98')) {
    return codePostal.slice(0, 3);
  }

  return codePostal.slice(0, 2);
}

export function formatExportDate(date: Date | null | undefined): string {
  if (!date) {
    return '';
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

// For timestamps (creation dates, notes): the calendar day as seen in Paris, the same day the
// export period filter uses. Date-only values stored at UTC midnight keep their day too.
export function formatExportDateInParis(date: Date | null | undefined): string {
  if (!date) {
    return '';
  }

  return formatExportDate(toWallClockDate(date));
}

// Line breaks inside a quoted cell are valid CSV, but Power BI's default import splits the row
// on them. Free text is therefore flattened to a single line.
export function toSingleLineText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.replace(/\s*(?:\r\n|\r|\n|\u2028|\u2029)+\s*/g, ' ').trim();
}

export function truncateExportCell(value: string): string {
  if (value.length <= EXPORT_CELL_MAX_LENGTH) {
    return value;
  }

  return value.slice(0, EXPORT_CELL_MAX_LENGTH - TRUNCATED_SUFFIX.length) + TRUNCATED_SUFFIX;
}

export function formatExportBoolean(value: boolean | null | undefined): string {
  if (value == null) {
    return '';
  }

  return value ? 'Oui' : 'Non';
}

export function formatExportReponseOuiNon(reponse: ReponseOuiNonValue): string {
  return formatReponseOuiNon(reponse) ?? '';
}

export function formatExportList(values: Array<string | null | undefined>): string {
  return values.filter((value): value is string => value != null && value !== '').join(', ');
}
