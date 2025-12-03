export function normalizeParentName(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/\u00A0/g, ' ')
    .replace(/['’]/g, "'")
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
