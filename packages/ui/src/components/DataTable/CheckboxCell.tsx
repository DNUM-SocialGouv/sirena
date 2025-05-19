import { memo } from 'react';
import type { RowWithId } from './DataTable.type';

type CheckboxCellProps<RowId extends string, Datum extends RowWithId<RowId>> = {
  id: string;
  row: Datum;
  rowIndex: number;
  rowId: RowId;
  selected: boolean;
  onToggleSelect: (id: Datum[RowId]) => void;
};

const CheckboxCellComponent = <Datum extends RowWithId<RowId>, RowId extends string>({
  id,
  row,
  rowIndex,
  rowId,
  selected,
  onToggleSelect,
}: CheckboxCellProps<RowId, Datum>) => {
  const inputId = `${id}-checkbox-key-${rowIndex}`;

  return (
    <th className="fr-cell--fixed" scope="row">
      <div className="fr-checkbox-group fr-checkbox-group--sm">
        <input
          data-fr-row-select="true"
          id={inputId}
          type="checkbox"
          value={row[rowId]}
          checked={selected}
          onChange={() => onToggleSelect(row[rowId])}
        />
        <label className="fr-label" htmlFor={inputId}>
          Sélectionner la ligne {rowIndex + 1}
        </label>
      </div>
    </th>
  );
};

export const CheckboxCell = memo(CheckboxCellComponent) as typeof CheckboxCellComponent;
