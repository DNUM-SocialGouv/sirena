import { memo } from 'react';
import type { ReactNode } from 'react';
import { CheckboxCell } from '../CheckboxCell/CheckboxCell';
import { DataCell } from '../DataCell/DataCell';
import type { Column, ColumnKey, RowWithId } from '../DataTable.type';

type DataTableRowProps<Datum extends RowWithId<RowId>, RowId extends string> = {
  row: Datum;
  rowIndex: number;
  rowId: RowId;
  id: string;
  selected: boolean;
  isSelectable: boolean;
  onToggleSelect: (id: Datum[RowId]) => void;
  columns: Column<Datum>[];
  getCell: (row: Datum, key: ColumnKey<Datum>) => ReactNode;
};

const DataTableRowComponent = <Datum extends RowWithId<RowId>, RowId extends string>({
  row,
  rowIndex,
  rowId,
  id,
  isSelectable,
  selected,
  onToggleSelect,
  columns,
  getCell,
}: DataTableRowProps<Datum, RowId>) => {
  return (
    <tr key={row[rowId]} id={`${id}-row-key-${rowIndex}`} data-row-key={row[rowId]} aria-selected={selected}>
      {isSelectable && (
        <CheckboxCell
          id={id}
          row={row}
          rowId={rowId}
          rowIndex={rowIndex}
          selected={selected}
          onToggleSelect={onToggleSelect}
        />
      )}
      {columns.map((column) => (
        <DataCell key={column.key} column={column} row={row} getCell={getCell} />
      ))}
    </tr>
  );
};

export const DataTableRow = memo(DataTableRowComponent) as typeof DataTableRowComponent;
