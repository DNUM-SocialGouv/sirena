const normalize = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'string') return value.trim() === '' ? undefined : value.trim();

  // An emptied collection reads like an absent one, so undoing the only input of a form clears it again.
  if (Array.isArray(value)) {
    const items = value.map(normalize);

    return items.length === 0 ? undefined : items;
  }

  if (value instanceof File) return value;

  if (typeof value === 'object') {
    const entries = Object.entries(value).flatMap(([key, entry]) => {
      const normalized = normalize(entry);

      return normalized === undefined ? [] : [[key, normalized] as const];
    });

    return entries.length === 0 ? undefined : Object.fromEntries(entries);
  }

  return value;
};

const isSame = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isSame(item, b[index]));
  }

  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    if (a instanceof File || b instanceof File) return false;

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    return (
      aKeys.length === bKeys.length &&
      aKeys.every((key) => isSame((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
    );
  }

  return false;
};

export const hasUnsavedChanges = (saved: unknown, current: unknown) => !isSame(normalize(saved), normalize(current));
