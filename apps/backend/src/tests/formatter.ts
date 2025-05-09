type ConvertDatesToStrings<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends (infer U)[]
      ? ConvertDatesToStrings<U>[]
      : T[K] extends object
        ? ConvertDatesToStrings<T[K]>
        : T[K];
};

export function convertDatesToStrings<T>(obj: T): ConvertDatesToStrings<T> {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertDatesToStrings(item)) as ConvertDatesToStrings<T>;
  }
  if (typeof obj === 'object' && obj !== null) {
    const result: Partial<ConvertDatesToStrings<T>> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value instanceof Date) {
          result[key] = value.toISOString() as ConvertDatesToStrings<T>[typeof key];
        } else if (typeof value === 'object' && value !== null) {
          result[key] = convertDatesToStrings(value) as ConvertDatesToStrings<T>[typeof key];
        } else {
          result[key] = value as ConvertDatesToStrings<T>[typeof key];
        }
      }
    }
    return result as ConvertDatesToStrings<T>;
  }
  return obj as ConvertDatesToStrings<T>;
}
