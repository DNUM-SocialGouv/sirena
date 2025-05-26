export const SORT_DIRECTIONS = {
  NONE: '',
  ASC: 'asc',
  DESC: 'desc',
} as const;

export const ARIA_SORT_VALUES = {
  NONE: 'none',
  ASC: 'ascending',
  DESC: 'descending',
} as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[keyof typeof SORT_DIRECTIONS];
export type AriaSort = (typeof ARIA_SORT_VALUES)[keyof typeof ARIA_SORT_VALUES];
