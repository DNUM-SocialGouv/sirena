export const getPropertyTypes = (obj: Record<string, unknown>): Record<string, string> => {
  const types: Record<string, string> = {};

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    let type: string = typeof val;

    // Distinguish null and arrays from plain objects
    if (type === 'object') {
      if (val === null) {
        type = 'null';
      } else if (Array.isArray(val)) {
        type = 'array';
      }
    }

    types[key] = type;
  }

  return types;
};
