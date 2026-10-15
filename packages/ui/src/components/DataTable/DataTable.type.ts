import type { ReactNode } from 'react';
import type { Primitive } from '../../utils/types';
import type { OnSortChangeParams as BaseSortParams } from './SortButton/SortButton';

export type Row = {
  [key: string]: Primitive | Row | unknown[] | undefined;
};

export type RowWithId<RowId extends string> = Row & {
  [key in RowId]: string | number;
};

export type NestedKeys<T> = {
  [K in keyof T]: K extends string
    ? NonNullable<T[K]> extends Primitive
      ? K
      : NonNullable<T[K]> extends Row
        ? `${K}.${NestedKeys<NonNullable<T[K]>>}`
        : never
    : never;
}[keyof T & string];

type SortLabels = {
  asc: string;
  desc: string;
  reset: string;
};

export type ColumnKey<T extends Row> = NestedKeys<T> | `custom:${string}`;

export type Column<T extends Row> = {
  key: ColumnKey<T>;
  label: string;
  // Rendered next to the title, inside the header cell. The label stays a plain string so it
  // remains usable as the accessible name of the sort button, and as the name of the cell
  // itself, which the header sets explicitly whenever a hint is present. Keep the hint light:
  // its text would otherwise join the column name announced with every cell, and anything
  // focusable in it adds a tab stop to the header row.
  labelHint?: ReactNode;
  isFixedLeft?: boolean;
  isFixedRight?: boolean;
  isSortable?: boolean;
  initialSortDirection?: 'asc' | 'desc';
  sortLabels?: SortLabels;
};

export type OnSortChangeParams<T extends Row> = BaseSortParams<ColumnKey<T>>;

export type Cells<T extends Row> = Partial<Record<ColumnKey<T>, (row: T) => ReactNode>>;
