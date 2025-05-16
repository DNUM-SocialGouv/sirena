import { memo } from 'react';
import type { ReactNode } from 'react';
import type { Column, ColumnKey, RowWithId } from './DataTable';

type DataTableRowProps<Datum extends RowWithId<RowId>, RowId extends string> = {
  row: Datum;
  rowIndex: number;
  rowId: RowId;
  id: string;
  selected: boolean;
  onToggleSelect: (id: Datum[RowId]) => void;
  columns: Column<Datum>[];
  getCell: (row: Datum, key: ColumnKey<Datum>) => ReactNode;
};

const DataTableRowComponent = <Datum extends RowWithId<RowId>, RowId extends string>({
  row,
  rowIndex,
  rowId,
  id,
  selected,
  onToggleSelect,
  columns,
  getCell,
}: DataTableRowProps<Datum, RowId>) => {
  return (
    <tr key={row[rowId]} id={`${id}-row-key-${rowIndex}`} data-row-key={row[rowId]} aria-selected={selected}>
      <th className="fr-cell--fixed" scope="row">
        <div className="fr-checkbox-group fr-checkbox-group--sm">
          <input
            data-fr-row-select="true"
            id={`${id}-checkbox-key-${rowIndex}`}
            type="checkbox"
            value={row[rowId]}
            checked={selected}
            onChange={() => onToggleSelect(row[rowId])}
          />
          <label className="fr-label" htmlFor={`${id}-checkbox-key-${rowIndex}`}>
            Sélectionner la ligne {rowIndex + 1}
          </label>
        </div>
      </th>
      {columns.map(({ key, isFixedLeft, isFixedRight }) => (
        <td
          key={key}
          className={`fr-cell ${isFixedLeft ? 'fr-cell--fixed' : ''} ${isFixedRight ? 'fr-cell--fixed-right' : ''}`}
        >
          {getCell(row, key)}
        </td>
      ))}
    </tr>
  );
};

export const DataTableRow = memo(DataTableRowComponent) as typeof DataTableRowComponent;
