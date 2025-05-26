import { isPrimitive } from '@/utils/guard';
import type { Primitive } from '@/utils/types';
import { type JSX, type ReactNode, memo, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import type { Column, ColumnKey, OnSortChangeParams, Row, RowWithId } from './DataTable.type';
import { DataTableHeader } from './DataTableHeader/DataTableHeader';
import { DataTableRow } from './DataTableRow/DataTableRow';
import type { SortDirection } from './SortButton/SortButton';
import './DataTable.css';

export type DataTableProps<K extends string, T extends RowWithId<K>> = {
  title: string;
  id?: string;
  rowId: K;
  data: T[];
  columns: Column<T>[];
  cells?: Partial<Record<ColumnKey<T>, (row: T) => ReactNode>>;
  size?: 'sm' | 'md' | 'lg';
  isBordered?: boolean;
  isSelectable?: boolean;
  emptyPlaceholder?: string;
  selectedValues?: T[K][];
  sort?: OnSortChangeParams<T>;
  onSortChange?: (params: OnSortChangeParams<T>) => void;
  onSelectedValuesChange?: (selectedValues: T[K][]) => void;
};

function isRow(x: Row | Primitive | unknown[]): x is Row {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function getNestedValue<T extends Row>(row: T, path: string) {
  const [head, ...tail] = path.split('.');
  const val = row[head];

  if (tail.length === 0) {
    return isPrimitive(val) ? String(val) : '';
  }

  if (isRow(val)) {
    const nextPath = tail.join('.');
    return getNestedValue(val, nextPath);
  }

  return '';
}

function useSelectAll<RowId extends string, Datum extends RowWithId<RowId>>(
  data: Datum[],
  rowId: RowId,
  selected: Datum[RowId][],
  id: string,
) {
  const allSelected = useMemo(() => data.length > 0 && selected.length === data.length, [data, selected]);
  const isIndeterminate = useMemo(() => selected.length > 0 && !allSelected, [selected, allSelected]);
  const toggleAll = () =>
    allSelected
      ? []
      : data.map((item, index) => {
          const element = document.getElementById(`${id}-row-key-${index}`);
          if (element) {
            const height = element.getBoundingClientRect().height + 2;
            element.style.setProperty('--row-height', `${height}px`);
          }
          return item[rowId];
        });
  return { allSelected, isIndeterminate, toggleAll };
}

function getTableClasses(size: 'sm' | 'md' | 'lg', isBordered: boolean): string {
  const classes = ['fr-table', `fr-table--${size}`, isBordered ? 'fr-table--bordered' : ''];
  return classes.filter(Boolean).join(' ');
}

export const DataTableComponent = <RowId extends string, Datum extends RowWithId<RowId>>({
  title,
  id = useId(),
  columns,
  data,
  rowId,
  cells = {},
  size = 'md',
  isBordered = false,
  isSelectable = false,
  emptyPlaceholder = 'Aucune donnée à afficher',
  selectedValues = [],
  sort = { sort: '', sortDirection: '' },
  onSortChange = () => {},
  onSelectedValuesChange = () => {},
}: DataTableProps<RowId, Datum>): JSX.Element => {
  const getCell = useMemo(() => {
    return (row: Datum, column: ColumnKey<Datum>) =>
      column in cells && cells[column] ? cells[column](row) : getNestedValue(row, column);
  }, [cells]);

  const selectedValuesRef = useRef(selectedValues);

  useEffect(() => {
    selectedValuesRef.current = selectedValues;
  }, [selectedValues]);

  useEffect(() => {
    const table = document.getElementById(id);

    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(() => {
        selectedValuesRef.current.forEach((_, index) => {
          const element = document.getElementById(`${id}-row-key-${index}`);
          if (element) {
            const height = element.getBoundingClientRect().height + 2;
            element.style.setProperty('--row-height', `${height}px`);
          }
        });
      });
    });

    if (table !== null) {
      resizeObserver.observe(table);
      return () => {
        resizeObserver.unobserve(table);
      };
    }
  }, [id]);

  const handleToggleSelect = useCallback(
    (value: Datum[RowId]) => {
      const next = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      onSelectedValuesChange(next);
    },
    [selectedValues, onSelectedValuesChange],
  );

  const handleSortChange = useCallback(
    ({ sort, sortDirection }: { sort: ColumnKey<Datum> | ''; sortDirection: SortDirection }) => {
      onSortChange({ sort, sortDirection });
    },
    [onSortChange],
  );

  const selectAllRef = useRef<HTMLInputElement>(null);

  const { allSelected, isIndeterminate, toggleAll } = useSelectAll(data, rowId, selectedValues, id);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const tableClasses = useMemo(() => getTableClasses(size, isBordered), [size, isBordered]);

  const renderedRows = useMemo(() => {
    return data.map((row, index) => (
      <DataTableRow
        key={row[rowId]}
        row={row}
        rowIndex={index}
        rowId={rowId}
        id={id}
        selected={selectedValues.includes(row[rowId])}
        isSelectable={isSelectable}
        onToggleSelect={handleToggleSelect}
        columns={columns}
        getCell={getCell}
      />
    ));
  }, [data, columns, selectedValues, handleToggleSelect, getCell, rowId, id, isSelectable]);

  return (
    <div className={tableClasses} id={`${id}-component`}>
      <div className="fr-table__wrapper">
        <div className="fr-table__container">
          <div className="fr-table__content">
            <table id={`${id}`}>
              <caption>{title}</caption>
              <DataTableHeader
                id={id}
                isSelectable={isSelectable}
                allSelected={allSelected}
                isIndeterminate={isIndeterminate}
                columns={columns}
                sort={sort}
                onToggleAll={() => onSelectedValuesChange(toggleAll())}
                onSortChange={handleSortChange}
              />
              <tbody>
                {renderedRows}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + +isSelectable} className="fr-text--sm">
                      {emptyPlaceholder}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
export * from './DataTable.type';
