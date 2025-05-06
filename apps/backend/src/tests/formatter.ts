type DeepDateToStrings<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? DeepDateToStrings<U>[]
    : T extends object
      ? { [K in keyof T]: DeepDateToStrings<T[K]> }
      : T;

// 2. Runtime converter
export function convertDatesToStrings<T>(obj: T): DeepDateToStrings<T> {
  if (obj instanceof Date) {
    return obj.toISOString() as DeepDateToStrings<T>;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertDatesToStrings(item)) as DeepDateToStrings<T>;
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Partial<Record<string, unknown>> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = convertDatesToStrings(val as unknown);
    }
    return result as DeepDateToStrings<T>;
  }

  return obj as DeepDateToStrings<T>;
}
