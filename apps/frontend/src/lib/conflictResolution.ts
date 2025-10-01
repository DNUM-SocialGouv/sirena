export interface ConflictInfo<T = Record<string, unknown>> {
  field: keyof T;
  originalValue: unknown;
  currentValue: unknown;
  serverValue: unknown;
}

export interface MergeResult<T = Record<string, unknown>> {
  merged: T;
  conflicts: ConflictInfo<T>[];
  hasConflicts: boolean;
  canAutoResolve: boolean;
}

export function detectAndMergeConflicts<T extends Record<string, unknown>>(
  original: T,
  current: T,
  server: T,
): MergeResult<T> {
  const conflicts: ConflictInfo<T>[] = [];
  const merged = {} as T;

  const allKeys = new Set([
    ...Object.keys(original || {}),
    ...Object.keys(current || {}),
    ...Object.keys(server || {}),
  ]) as Set<keyof T>;

  for (const key of allKeys) {
    const originalValue = original?.[key as string];
    const currentValue = current?.[key as string];
    const serverValue = server?.[key as string];

    const userModified = !isEqual(originalValue, currentValue);
    const serverModified = !isEqual(originalValue, serverValue);

    if (userModified && serverModified && !isEqual(currentValue, serverValue)) {
      conflicts.push({
        field: key,
        originalValue,
        currentValue,
        serverValue,
      });

      (merged as Record<string, unknown>)[key as string] = currentValue;
    } else if (userModified && !serverModified) {
      (merged as Record<string, unknown>)[key as string] = currentValue;
    } else if (!userModified && serverModified) {
      (merged as Record<string, unknown>)[key as string] = serverValue;
    } else {
      (merged as Record<string, unknown>)[key as string] = currentValue ?? serverValue ?? originalValue;
    }
  }

  const canAutoResolve = conflicts.length === 0;

  return {
    merged,
    conflicts,
    hasConflicts: conflicts.length > 0,
    canAutoResolve,
  };
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object' && a !== null && b !== null) {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!isEqual(objA[key], objB[key])) return false;
    }
    return true;
  }

  return false;
}
