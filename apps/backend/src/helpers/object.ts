/**
 * @description Pick specified keys from an object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Partial<Pick<T, K>>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result as Pick<T, K>;
}

const DEFAULT_MAX_DEPTH = 5;

const flattenKeys = (value: unknown, prefix: string, depth: number, keys: Set<string>): void => {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      flattenKeys(item, prefix, depth, keys);
    }
    return;
  }

  if (typeof value === 'object' && !(value instanceof Date)) {
    if (depth === 0) {
      if (prefix) {
        keys.add(prefix);
      }
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      flattenKeys(child, prefix ? `${prefix}.${key}` : key, depth - 1, keys);
    }
    return;
  }

  if (prefix) {
    keys.add(prefix);
  }
};

/**
 * @description Collects the dot-separated paths of the non-null leaves of an object.
 * Array items are merged under the same path, paths deeper than maxDepth are truncated to the object node.
 */
export function collectDataKeys(value: unknown, maxDepth: number = DEFAULT_MAX_DEPTH): string[] {
  const keys = new Set<string>();
  flattenKeys(value, '', maxDepth, keys);
  return [...keys].sort();
}

/**
 * @description Checks if two values are deeply equal (simple cases, does not handle set/map/function/symbol/regexp, class instances or recursive references).
 * Useful for comparing objects before/after saving to a database
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;

  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => isEqual(item, b[i]));
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof Date || b instanceof Date) {
    return false;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(
      (key) => key in b && isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    );
  }

  return false;
}
