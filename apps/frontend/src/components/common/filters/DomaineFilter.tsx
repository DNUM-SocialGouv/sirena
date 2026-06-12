import { domainesFonctionnelsLabels } from '@sirena/common/constants';
import { useMemo } from 'react';
import { DropdownCheckboxFilter } from './DropdownCheckboxFilter';

type CountsMap = Record<string, number>;

type Props = {
  selectedIds: string[];
  counts: CountsMap | null;
  onChange: (ids: string[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function DomaineFilter({ selectedIds, counts, onChange, onOpen, onClose }: Props) {
  const options = useMemo(
    () =>
      Object.entries(domainesFonctionnelsLabels)
        .sort(([, a], [, b]) => a.localeCompare(b, 'fr'))
        .map(([id, label]) => {
          const count = counts?.[id];
          return {
            value: id,
            label: `${label}${count !== undefined ? ` (${count})` : ''}`,
          };
        }),
    [counts],
  );

  return (
    <DropdownCheckboxFilter
      buttonLabel="Domaine fonctionnel"
      selectedValuesLabel={(count) => `domaine${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`}
      legend="Filtrer les requêtes par domaine fonctionnel"
      hintText="Domaine fonctionnel (nombre de requêtes)"
      options={options}
      selectedValues={selectedIds}
      onChange={onChange}
      onOpen={onOpen}
      onClose={onClose}
    />
  );
}
