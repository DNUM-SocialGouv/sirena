import { memo, useCallback } from 'react';
import type { RowWithId } from '../DataTable.type';

type CheckboxCellProps<Datum extends RowWithId<RowId>, RowId extends string> = {
  id: string;
  row: Datum;
  rowIndex: number;
  rowId: RowId;
  selected: boolean;
  onToggleSelect: (id: Datum[RowId]) => void;
};

const checkboxCellComponent = <Datum extends RowWithId<RowId>, RowId extends string>({
  id,
  row,
  rowIndex,
  rowId,
  selected,
  onToggleSelect,
}: CheckboxCellProps<Datum, RowId>) => {
  const inputId = `${id}-checkbox-key-${rowIndex}`;

  const handleChange = useCallback(() => onToggleSelect(row[rowId]), [onToggleSelect, row, rowId]);

  return (
    <th className="fr-cell--fixed" scope="row">
      <div className="fr-checkbox-group fr-checkbox-group--sm">
        <input
          data-fr-row-select="true"
          id={inputId}
          type="checkbox"
          value={row[rowId]}
          checked={selected}
          onChange={handleChange}
        />
        <label className="fr-label" htmlFor={inputId}>
          Sélectionner la ligne {rowIndex + 1}
        </label>
      </div>
    </th>
  );
};

export const CheckboxCell = memo(checkboxCellComponent) as typeof checkboxCellComponent;
