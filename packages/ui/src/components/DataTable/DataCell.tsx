import type { ReactNode } from 'react';
import type { Column, ColumnKey, RowWithId } from './DataTable.type';

type DataCellProps<Datum extends RowWithId<RowId>, RowId extends string> = {
  row: Datum;
  column: Column<Datum>;
  getCell: (row: Datum, key: ColumnKey<Datum>) => ReactNode;
};

export const DataCell = <Datum extends RowWithId<RowId>, RowId extends string>({
  row,
  column,
  getCell,
}: DataCellProps<Datum, RowId>) => {
  const { key, isFixedLeft, isFixedRight } = column;

  return (
    <td className={`fr-cell ${isFixedLeft ? 'fr-cell--fixed' : ''} ${isFixedRight ? 'fr-cell--fixed-right' : ''}`}>
      {getCell(row, key)}
    </td>
  );
};
