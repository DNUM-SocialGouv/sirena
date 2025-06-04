import type { ReactNode } from 'react';
import type { Primitive } from '../../utils/types';
import type { OnSortChangeParams as BaseSortParams } from './SortButton/SortButton';

export type Row = {
  [key: string]: Primitive | Row | unknown[];
};

export type RowWithId<RowId extends string> = Row & {
  [key in RowId]: string | number;
};

export type NestedKeys<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends Primitive
      ? K
      : T[K] extends Row
        ? `${K}.${NestedKeys<T[K]>}`
        : never
    : never;
}[keyof T & string];

export type ColumnKey<T extends Row> = NestedKeys<T> | `custom:${string}`;

export type Column<T extends Row> = {
  key: ColumnKey<T>;
  label: string;
  isFixedLeft?: boolean;
  isFixedRight?: boolean;
  isSortable?: boolean;
};

export type OnSortChangeParams<T extends Row> = BaseSortParams<ColumnKey<T>>;

export type Cells<T extends Row> = Partial<Record<ColumnKey<T>, (row: T) => ReactNode>>;
