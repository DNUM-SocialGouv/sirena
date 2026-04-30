import { memo } from 'react';
import type { Column, ColumnKey, OnSortChangeParams, RowWithId } from '../DataTable.type';
import { SortButton } from '../SortButton/SortButton';
import { ARIA_SORT_VALUES, type SortDirection } from '../SortButton/SortButton.constants';

type DataTableHeaderProps<T extends RowWithId<string>> = {
  id: string;
  isSelectable: boolean;
  allSelected: boolean;
  isIndeterminate: boolean;
  columns: Column<T>[];
  sort: OnSortChangeParams<T>;
  onToggleAll: () => void;
  onSortChange: (params: OnSortChangeParams<T>) => void;
};

export const DataTableHeaderComponent = <T extends RowWithId<string>>({
  id,
  isSelectable,
  allSelected,
  isIndeterminate,
  columns,
  sort,
  onToggleAll,
  onSortChange,
}: DataTableHeaderProps<T>) => {
  return (
    <thead>
      <tr>
        {isSelectable && (
          <th className="fr-cell--fixed" scope="col">
            <div className="fr-checkbox-group fr-checkbox-group--sm">
              <input
                data-fr-row-select="true"
                id={`${id}-checkbox-key-selectAll`}
                type="checkbox"
                aria-checked={isIndeterminate ? 'mixed' : allSelected ? 'true' : 'false'}
                checked={allSelected}
                onChange={onToggleAll}
              />
              <label className="fr-label" htmlFor={`${id}-checkbox-key-selectAll`}>
                Sélectionner toutes les lignes
              </label>
            </div>
          </th>
        )}
        {columns.map((column) => {
          const isActive = sort.sort === column.key;

          const currentDirection: SortDirection = isActive ? sort.sortDirection : '';

          const nextDirection = currentDirection === 'asc' ? 'desc' : 'asc';

          const label = column.sortLabels?.[nextDirection] ?? `Trier par ${column.label}`;

          const getAriaSort = () => {
            if (!isActive || sort.sortDirection === '') {
              return ARIA_SORT_VALUES.NONE;
            }
            if (sort.sortDirection === 'asc') {
              return ARIA_SORT_VALUES.ASC;
            }
            return ARIA_SORT_VALUES.DESC;
          };

          return (
            <th
              key={column.key}
              className={`${column.isFixedLeft ? 'fr-cell--fixed' : ''} ${
                column.isFixedRight ? 'fr-cell--fixed-right' : ''
              }`}
              scope="col"
              aria-sort={column.isSortable ? getAriaSort() : undefined}
            >
              <div className="fr-cell--sort">
                <span className="fr-cell__title">{column.label}</span>

                {column.isSortable && (
                  <SortButton<ColumnKey<T>>
                    sort={sort.sort}
                    sortKey={column.key}
                    sortDirection={sort.sortDirection}
                    onSortChange={onSortChange}
                    label={label}
                  />
                )}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

export const DataTableHeader = memo(DataTableHeaderComponent) as typeof DataTableHeaderComponent;
