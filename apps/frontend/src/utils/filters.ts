/** Parse a comma-separated URL filter param into a clean list of values. */
export const splitCsv = (value: string | null | undefined): string[] =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
