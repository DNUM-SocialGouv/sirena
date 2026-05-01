import { memo, type ReactNode } from 'react';
import type { Column, ColumnKey, RowWithId } from '../DataTable.type';

type DataCellProps<Datum extends RowWithId<RowId>, RowId extends string> = {
  row: Datum;
  column: Column<Datum>;
  getCell: (row: Datum, key: ColumnKey<Datum>) => ReactNode;
};

const EmptyCell = ({ label = 'non renseigné' }: { label?: string }) => (
  <span aria-hidden="true">
    -<span className="fr-sr-only">{label}</span>
  </span>
);

const isEmpty = (value: ReactNode) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
};

const dataCellComponent = <Datum extends RowWithId<RowId>, RowId extends string>({
  row,
  column,
  getCell,
}: DataCellProps<Datum, RowId>) => {
  const { key, isFixedLeft, isFixedRight } = column;

  const value = getCell(row, key);

  return (
    <td className={`fr-cell ${isFixedLeft ? 'fr-cell--fixed' : ''} ${isFixedRight ? 'fr-cell--fixed-right' : ''}`}>
      {isEmpty(value) ? <EmptyCell /> : value}
    </td>
  );
};

export const DataCell = memo(dataCellComponent) as typeof dataCellComponent;
